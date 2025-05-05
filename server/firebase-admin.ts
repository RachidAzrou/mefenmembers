import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// SERVERLESS-VRIENDELIJKE VERSIE met serviceaccount.json ondersteuning
console.log('[FirebaseAdmin] Initialisatie start...');

// Paden naar serviceaccount bestanden
const serviceAccountPaths = [
  path.join(process.cwd(), 'secrets', 'firebase-serviceaccount.json'),
  path.join(process.cwd(), 'firebase-serviceaccount.json'),
  path.join(process.cwd(), 'mefen-leden-firebase-adminsdk.json')
];

// Eén keer initialiseren op een veilige manier die werkt in serverless omgevingen
const getFirebaseAdmin = () => {
  try {
    if (admin.apps.length === 0) {
      console.log('[FirebaseAdmin] Vercel omgeving:', !!process.env.VERCEL);
      
      // METHODE 1: Probeer serviceaccount JSON bestand te laden
      let serviceAccount = null;
      
      // Loop door mogelijke locaties van het serviceaccount bestand
      for (const filePath of serviceAccountPaths) {
        try {
          if (fs.existsSync(filePath)) {
            console.log(`[FirebaseAdmin] Serviceaccount JSON gevonden op: ${filePath}`);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            serviceAccount = JSON.parse(fileContent);
            break;
          }
        } catch (err) {
          console.log(`[FirebaseAdmin] Kon bestand niet lezen: ${filePath}`);
        }
      }
      
      // Als we een serviceaccount bestand hebben gevonden, gebruik het
      if (serviceAccount) {
        console.log('[FirebaseAdmin] Initialisatie met serviceaccount JSON bestand');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
        });
      } 
      // METHODE 2: Gebruik omgevingsvariabelen als fallback
      else {
        console.log('[FirebaseAdmin] Serviceaccount JSON niet gevonden, gebruik omgevingsvariabelen');
        console.log('[FirebaseAdmin] Project ID aanwezig:', !!process.env.FIREBASE_PROJECT_ID);
        console.log('[FirebaseAdmin] Client Email aanwezig:', !!process.env.FIREBASE_CLIENT_EMAIL);
        console.log('[FirebaseAdmin] Private Key aanwezig:', !!process.env.FIREBASE_PRIVATE_KEY);
        
        // Verwerk de private key
        const privateKey = process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
          undefined;
        
        // Voor debugging (alleen veilige informatie)
        if (process.env.VERCEL) {
          console.log('[FirebaseAdmin] Private key lengte:', privateKey ? privateKey.length : 0);
          if (privateKey) {
            console.log('[FirebaseAdmin] Private key begint met:', privateKey.substring(0, 20) + '...');
            console.log('[FirebaseAdmin] Private key eindigt met:', '...' + privateKey.substring(privateKey.length - 20));
          }
        }
        
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID || 'mefen-leden',
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-j4oqr@mefen-leden.iam.gserviceaccount.com',
              privateKey: privateKey
            } as admin.ServiceAccount),
            databaseURL: 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
          });
        } catch (e) {
          console.error('[FirebaseAdmin] Initialisatie met omgevingsvariabelen mislukt:', e);
          throw e;
        }
      }
      
      console.log('[FirebaseAdmin] Initialisatie succesvol voltooid');
    }
    
    return admin;
  } catch (error) {
    console.error('[FirebaseAdmin] Initialisatie FOUT:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Kon Firebase Admin niet initialiseren: ${errorMessage}`);
  }
};

// Initialiseer Firebase Admin
const firebaseAdmin = getFirebaseAdmin();

// Noodoplossing: Als de initialisatie toch mislukt is op Vercel, 
// kunnen we een fallback mechanisme instellen
let firestoreInstance;
let rtdbInstance;

try {
  firestoreInstance = firebaseAdmin.firestore();
  rtdbInstance = firebaseAdmin.database();
  console.log('[FirebaseAdmin] Firestore en RTDB services succesvol geïnitialiseerd');
} catch (error) {
  console.error('[FirebaseAdmin] Kon services niet initialiseren, bezig met fallback configuratie:', error);
  
  // In Vercel productie-omgeving, log extra informatie voor debugging
  if (process.env.VERCEL) {
    console.error('[FirebaseAdmin] Vercel environment informatie:');
    console.error('- NODE_ENV:', process.env.NODE_ENV);
    console.error('- VERCEL_ENV:', process.env.VERCEL_ENV);
    console.error('- VERCEL_REGION:', process.env.VERCEL_REGION);
  }
  
  // Fallback: null-objecten zodat de applicatie niet crasht
  // De API routes zullen hierdoor een gecontroleerde foutmelding geven
  firestoreInstance = null;
  rtdbInstance = null;
}

// Exporteer de benodigde services
export const firestore = firestoreInstance;
export const rtdb = rtdbInstance;
export default firebaseAdmin;