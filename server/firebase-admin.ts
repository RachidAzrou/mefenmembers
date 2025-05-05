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
      const privateKey = process.env.FIREBASE_PRIVATE_KEY ? 
        process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
        '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n';
        
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'mefen-leden',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-j4oqr@mefen-leden.iam.gserviceaccount.com',
          privateKey: privateKey
        } as admin.ServiceAccount),
        databaseURL: 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
      });
      
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

// Exporteer de benodigde services
export const firestore = firebaseAdmin.firestore();
export const rtdb = firebaseAdmin.database();
export default firebaseAdmin;