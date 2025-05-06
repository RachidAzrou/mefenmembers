// Admin SDK initialisatie voor API routes
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Controleer of de app al is geïnitialiseerd om dubbele initialisatie te voorkomen
let firebaseAdmin;

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

// Utility functie voor Firebase REST API requests met admin-token
async function firebaseAdminRequest(method, path, data = null) {
  try {
    // Toegang tot de database direct via de Admin SDK
    const db = firebaseAdmin.database();
    const ref = db.ref(path);
    
    let result;
    
    switch (method) {
      case 'GET':
        result = await ref.once('value');
        return result.val();
        
      case 'POST':
        result = await ref.push(data);
        return { name: result.key };
        
      case 'PUT':
        await ref.set(data);
        return data;
        
      case 'PATCH':
        await ref.update(data);
        return data;
        
      case 'DELETE':
        await ref.remove();
        return null;
        
      default:
        throw new Error(`Niet-ondersteunde methode: ${method}`);
    }
  } catch (error) {
    console.error(`Firebase Admin API fout (${method} ${path}):`, error.message);
    throw error;
  }
}

module.exports = {
  firebaseAdmin,
  firebaseAdminRequest
};