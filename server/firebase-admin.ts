import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// SERVERLESS-VRIENDELIJKE VERSIE met prioriteit voor RTDB
console.log('[FirebaseAdmin] Initialisatie start...');

// Firebase Realtime Database URL
const RTDB_URL = 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app';

// Paden naar serviceaccount bestanden
const serviceAccountPaths = [
  path.join(process.cwd(), 'secrets', 'firebase-serviceaccount.json'),
  path.join(process.cwd(), 'firebase-serviceaccount.json'),
  path.join(process.cwd(), 'mefen-leden-firebase-adminsdk.json')
];

// Vereenvoudigde initialisatie specifiek voor RTDB gebruik
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
          databaseURL: process.env.FIREBASE_DATABASE_URL || RTDB_URL
        });
      } 
      // METHODE 2: Gebruik omgevingsvariabelen als fallback
      else {
        console.log('[FirebaseAdmin] Serviceaccount JSON niet gevonden, gebruik omgevingsvariabelen');
        console.log('[FirebaseAdmin] Project ID aanwezig:', !!process.env.FIREBASE_PROJECT_ID);
        console.log('[FirebaseAdmin] Client Email aanwezig:', !!process.env.FIREBASE_CLIENT_EMAIL);
        console.log('[FirebaseAdmin] Private Key aanwezig:', !!process.env.FIREBASE_PRIVATE_KEY);
        
        // Verwerk de private key
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Verwerk de private key op drie verschillende manieren om maximale compatibiliteit te garanderen
        if (privateKey) {
          // 1. Vervang escaped newlines door echte newlines
          privateKey = privateKey.replace(/\\n/g, '\n');
          
          // 2. Verwijder begin en eind quotes indien aanwezig
          if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
          }
          
          // Log veilige informatie voor debugging
          console.log('[FirebaseAdmin] Private key verwerkt, lengte:', privateKey.length);
          console.log('[FirebaseAdmin] Begin/eind regex check:', 
            privateKey.includes('-----BEGIN PRIVATE KEY-----') && 
            privateKey.includes('-----END PRIVATE KEY-----'));
        }
        
        // VEREENVOUDIGDE INITIALISATIE voor betere Vercel-compatibiliteit
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID || 'mefen-leden',
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-j4oqr@mefen-leden.iam.gserviceaccount.com',
              privateKey: privateKey
            } as admin.ServiceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL || RTDB_URL
          });
          console.log('[FirebaseAdmin] Initialisatie succesvol voltooid');
        } catch (e) {
          console.error('[FirebaseAdmin] FOUT bij initialisatie met omgevingsvariabelen:', e);
          
          // METHODE 3: Fallback naar simpele app initialisatie voor alleen RTDB toegang
          // Hiervoor zijn minder credentials nodig
          try {
            console.log('[FirebaseAdmin] Proberen met vereenvoudigde initialisatie (alleen voor RTDB)');
            
            // In sommige gevallen kan RTDB toegankelijk zijn zonder volledige authenticatie
            admin.initializeApp({
              databaseURL: process.env.FIREBASE_DATABASE_URL || RTDB_URL
            });
            console.log('[FirebaseAdmin] Vereenvoudigde initialisatie succesvol voltooid');
          } catch (fallbackError) {
            console.error('[FirebaseAdmin] Ook vereenvoudigde initialisatie mislukt:', fallbackError);
            throw fallbackError;
          }
        }
      }
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

// Probeer eerst Realtime Database te verkrijgen, dan pas Firestore
let rtdbInstance = null;
let firestoreInstance = null;

try {
  // Probeer eerst RTDB te initialiseren - dit is de primaire database voor deze implementatie
  rtdbInstance = firebaseAdmin.database();
  console.log('[FirebaseAdmin] Realtime Database succesvol geïnitialiseerd');
  
  // Probeer daarna Firestore te initialiseren als fallback
  try {
    firestoreInstance = firebaseAdmin.firestore();
    console.log('[FirebaseAdmin] Firestore ook succesvol geïnitialiseerd');
  } catch (firestoreError) {
    console.log('[FirebaseAdmin] Firestore niet beschikbaar (niet erg, we gebruiken RTDB):', firestoreError.message);
    firestoreInstance = null;
  }
} catch (error) {
  console.error('[FirebaseAdmin] Kon database services niet initialiseren:', error);
  
  // In Vercel productie-omgeving, log extra informatie voor debugging
  if (process.env.VERCEL) {
    console.error('[FirebaseAdmin] Vercel environment informatie:');
    console.error('- NODE_ENV:', process.env.NODE_ENV);
    console.error('- VERCEL_ENV:', process.env.VERCEL_ENV);
    console.error('- VERCEL_REGION:', process.env.VERCEL_REGION);
    console.error('- DATABASE_URL:', process.env.FIREBASE_DATABASE_URL ? 'ingesteld' : 'niet ingesteld');
  }
  
  // Fallback: null-objecten zodat de applicatie niet crasht
  rtdbInstance = null;
  firestoreInstance = null;
}

// Exporteer de benodigde services
export const rtdb = rtdbInstance;
export const firestore = firestoreInstance;
export default firebaseAdmin;