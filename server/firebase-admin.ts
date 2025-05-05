import admin from 'firebase-admin';

// SERVERLESS-VRIENDELIJKE VERSIE
// De Firebase Admin initialisatie is zo geschreven dat deze werkt in zowel serverless (Vercel)
// als traditionele Node.js-omgevingen (lokale ontwikkeling)
console.log('[FirebaseAdmin] Initialisatie start...');

// Vercel serverless hack om te onderzoeken
//process.env.FIREBASE_PRIVATE_KEY_STRING = process.env.FIREBASE_PRIVATE_KEY || '';

// Eén keer initialiseren op een veilige manier die werkt in serverless omgevingen
const getFirebaseAdmin = () => {
  try {
    if (admin.apps.length === 0) {
      // Debug info (veilig zonder gevoelige data te tonen)
      console.log('[FirebaseAdmin] Project ID aanwezig:', !!process.env.FIREBASE_PROJECT_ID);
      console.log('[FirebaseAdmin] Client Email aanwezig:', !!process.env.FIREBASE_CLIENT_EMAIL);
      console.log('[FirebaseAdmin] Private Key aanwezig:', !!process.env.FIREBASE_PRIVATE_KEY);
      console.log('[FirebaseAdmin] Vercel omgeving:', !!process.env.VERCEL);
      
      // Bereid de credentials voor op een serverless-vriendelijke manier
      // Specifieke aanpassingen voor Vercel omgeving
      let privateKey;
      
      if (process.env.VERCEL) {
        console.log('[FirebaseAdmin] Vercel-specifieke private key verwerking');
        // Vercel vereist deze vorm van verwerking voor private keys
        privateKey = process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
          undefined;
      } else {
        // Standaard ontwikkelomgeving
        privateKey = process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
          '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n';
      }
      
      // Voor debugging (alleen veilige informatie)
      if (process.env.VERCEL) {
        console.log('[FirebaseAdmin] Private key lengte:', privateKey ? privateKey.length : 0);
        console.log('[FirebaseAdmin] Private key begint met:', privateKey ? privateKey.substring(0, 20) + '...' : 'undefined');
      }
        
      // Verschillende configuratiemethode voor Vercel vs. lokale omgeving
      if (process.env.VERCEL) {
        console.log('[FirebaseAdmin] Vercel-specifieke initialisatie');
        
        try {
          // Poging 1: Met verwerkte serviceaccount 
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey
            } as admin.ServiceAccount),
            databaseURL: 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
          });
        } catch (e) {
          console.error('[FirebaseAdmin] Eerste initialisatiemethode mislukt, alternatief proberen:', e);
          
          try {
            // Poging 2: Met projectId en clientEmail als directe waarden
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId: "mefen-leden",
                clientEmail: "firebase-adminsdk-j4oqr@mefen-leden.iam.gserviceaccount.com",
                privateKey: privateKey
              } as admin.ServiceAccount),
              databaseURL: "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app"
            });
          } catch (e2) {
            console.error('[FirebaseAdmin] Tweede initialisatiemethode mislukt:', e2);
            // We laten de fout doorbubbelen naar de volgende catch
            throw e2;
          }
        }
      } else {
        // Standaard lokale ontwikkelomgeving
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'mefen-leden',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-j4oqr@mefen-leden.iam.gserviceaccount.com',
            privateKey: privateKey
          } as admin.ServiceAccount),
          databaseURL: 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
        });
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