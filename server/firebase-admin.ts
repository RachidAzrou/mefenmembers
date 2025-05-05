import * as admin from 'firebase-admin';

// Initialiseer Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    // Als je deployt naar Vercel, gebruik omgevingsvariabelen
    // Als je lokaal werkt, gebruik een serviceAccount.json bestand
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'mefen-leden',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // De private key moet vervangen worden omdat env variabelen nieuwe regels verliezen
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
  });
}

export const firestore = admin.firestore();
export const rtdb = admin.database();
export default admin;