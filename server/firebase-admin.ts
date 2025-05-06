import * as admin from 'firebase-admin';

// Controleer of de app al is geïnitialiseerd om dubbele initialisatie te voorkomen
let firebaseAdmin: admin.app.App;

try {
  firebaseAdmin = admin.app();
} catch (error) {
  // Initialiseer een nieuwe Firebase Admin-instantie
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'mefen-leden-default-rtdb',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      // Verschillende platforms slaan de private key op verschillende manieren op
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 
        process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
  });
}

export default firebaseAdmin;
export const auth = firebaseAdmin.auth();
export const db = firebaseAdmin.database();

// Utility functie voor Firebase REST API requests met admin-token
export async function firebaseAdminRequest(method: string, path: string, data: any = null): Promise<any> {
  // Genereer een token dat kan worden gebruikt voor geautoriseerde toegang
  const token = await firebaseAdmin.auth().createCustomToken('server-admin');
  
  // Bouw de URL inclusief token
  const url = `${process.env.FIREBASE_DATABASE_URL || 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'}/${path}.json?auth=${token}`;
  
  // Gebruik node-fetch voor HTTP-verzoeken
  const fetch = (await import('node-fetch')).default;
  
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Firebase Admin API fout: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Firebase Admin API fout (${method} ${path}):`, error);
    throw error;
  }
}