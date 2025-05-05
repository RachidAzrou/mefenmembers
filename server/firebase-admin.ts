import admin from 'firebase-admin';

// Console.log om te debuggen (alleen in development)
console.log('Firebase Admin: Configuratie wordt geïnitialiseerd');
console.log('Project ID beschikbaar:', !!process.env.FIREBASE_PROJECT_ID);
console.log('Client Email beschikbaar:', !!process.env.FIREBASE_CLIENT_EMAIL);
console.log('Private Key beschikbaar:', !!process.env.FIREBASE_PRIVATE_KEY);

// Initialiseer Firebase Admin SDK
let firebaseConfig;

// Voor Vercel Production
if (process.env.VERCEL) {
  console.log('Vercel omgeving gedetecteerd, speciale configuratie wordt gebruikt');
  
  // Probeer de Firebase Admin te initialiseren met JSON
  try {
    // Als dit een Vercel deployment is, gebruik dan een andere methode
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // In Vercel: zorg dat je private key correct is, inclusief escape characters
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        } as admin.ServiceAccount),
        databaseURL: 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
      });
    }
  } catch (error) {
    console.error('Firebase initialisatie fout in Vercel:', error);
  }
} else {
  // Voor lokale ontwikkeling
  console.log('Lokale omgeving gedetecteerd, standaard configuratie wordt gebruikt');
  
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'mefen-leden',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-j4oqr@mefen-leden.iam.gserviceaccount.com',
    // De private key moet vervangen worden omdat env variabelen nieuwe regels verliezen
    privateKey: process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDe0s0MuShjCXK4\nCCGEKYJWbkgNb8b/NPWgY/adovWbSgYmzM4Gx3tFbxZbD+NMO3PmOcYPPXyZmq5E\nA+VoUUkQYu0Vq+QrZRvJPG46XGcU4RgSS4jLrFrTGAQ/fYp2nFPPGhJ0Dq+z5WsV\nyzYNCKmHVRmQHGlf3oNKUBYkYwgOYb9yZdVkR8KfbHpwkiO5xvUEqXYQrCIGOibK\nRPuDkA42Lpr/YMuKEwwGzfV0+2rqYITMtf5g0YBnCLfP4R2m1k+xrLZ49udQXOVc\nW8lZuiH4ZNnE4hZPQKlbk0G+FtZFAxXofWcw2ncUHx8MHwTzGAfwvJVVPu+GzkM2\n+WxwPbfNAgMBAAECggEAGlGRkUktANZGDXTrF1wfhQQEzUDWm2eH1ka0E7DjVhZs\nDe05Fw2IBhwERlnk8PFADhZOQoZGxeGbzgWSxUMVwFCBrwdXUXENQ58SJ88lax8Y\nuZOUAQXPNJHS0D/7HSbT2zXMrA/VNrPdEsZF4FsIBHLCmWdBNQCODLRs4mI1E/ZL\nqO9oF5PSPUXNVZcQEuUcSvGjRuLBQGRhZIQUi7s1cJc8AiDZjpQh5iG0aTmfOzQl\nUw2A91S7HtRbYZ89BYfxhw3K/+JVr+Kv2a3NZB5wHNCB56I8u8znbad8UwEKW0rR\nA6QaS9E5h1OIB20pnAEaL49GgOF9kgtuH9ESX6FRgwKBgQDvq/6/zzrldYfQXYxs\nZVjqAzUCbMgPCusoYOtKQYK9SHpqTSHRCDnYgF88oJ17+OPDhY3QJGgqYuJUemN4\n2+t9PmxsRwQn4bLfj6bsXwU8B35TFIKxnQI0LQBdTJMFJlSfuvn6DfeZd0j9UMFT\n3DgAl+R1URHM5LnvscZgzfR/mwKBgQDuWgp0kVEY/DSKpjfnvFPL+5UV1UeYGByP\nB+Pm6rCO0KR9/o4g/F+S60yk1QvF9zTywb+bMeJbqkD5mQWVoGJOQQR5bBEGe3am\nRkOKZ0J6vOXlrnOmdfJvUW/uCTzQTLiQlJLq1A0NLJ+oY4SzTBF6uo4XVrXI6Sbn\nSfIzgCHAhwKBgQDo5y8AEIr9iWJpYN7NqJ4jQvpS/iob4AykXblwYqeoDQkQ9R1m\n4WT+xG+wQjR5XgERCBAjKvXzGCGRVGJcPzm6wG2g7OiH03NHysmjNpYFnvdYZxfP\nD5Zyqs0VBvIxiakuQIAsCRpwlEz5ybvEHwLwwu4KAIkF2KXGgP4A5p8GFQKBgF+e\ng1+F8aYTfVa+WZQMvJ8Iu0BZapxxZDARv0gCQE7Mdkhcf0dY6H25tLKbGmkwpEJR\nDHBV4aD3KqmtWVQBLRB0irAZ7m7SJ/Wl83BCTcxoWOATLpkZLdbPX9EXPvobSBVx\nkw0J3I2CGuriCWe9EoWR2gBG9q8xPkEiOkeEh4NfAoGAN3XLRJvtSkRITc4qFAa3\nt2KcX2orYIhQVcH7vCt7b48p4KYxVZJm4CC0j/bsSr+K0YQiWQiKXzRwc/KlGBVQ\n/FuZcnXMKOSJNQRQGLQiXFLJ2oRbMB8oKFQ0uReYzf+A2MdPRcDiMCvEyo8V4+8S\npMrEbdIhYWILgu3SVBlxzGs=\n-----END PRIVATE KEY-----\n'
  };

  // Initialiseer Firebase Admin als het nog niet is geïnitialiseerd
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
      });
    } catch (error) {
      console.error('Firebase initialisatie fout in lokale omgeving:', error);
    }
  }
}

export const firestore = admin.firestore();
export const rtdb = admin.database();
export default admin;