// Debug bestand om Firebase instellingen te testen
import { db, auth } from "../lib/firebase";

// Functie om de huidige configuratie in de console te loggen
export function logFirebaseConfig() {
  try {
    console.log("Firebase Debug Info:");
    console.log("Auth:", {
      currentUser: auth.currentUser,
      app: auth.app,
      config: auth.app.options
    });
    
    console.log("Database:", {
      instance: db,
      app: (db as any)._repoInternal?.app,
      url: (db as any)._repoInternal?.repoInfo?.databaseURL,
      namespace: (db as any)._repoInternal?.namespace || 'unknown'
    });
    
    // Log omgevingsvariabelen (veilig, zonder echte waarden te tonen)
    console.log("Environment Variables Present:", {
      VITE_FIREBASE_API_KEY: !!import.meta.env.VITE_FIREBASE_API_KEY,
      VITE_FIREBASE_PROJECT_ID: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
      VITE_FIREBASE_DATABASE_URL: !!import.meta.env.VITE_FIREBASE_DATABASE_URL,
      VITE_FIREBASE_APP_ID: !!import.meta.env.VITE_FIREBASE_APP_ID
    });
    
    // Log berekende database URL
    const calculatedURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || 
                        `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mefenmembers'}-default-rtdb.europe-west1.firebasedatabase.app`;
    console.log("Calculated Firebase URL:", calculatedURL);
    
    // Test directe REST API
    console.log("Testing direct REST API access...");
    fetch(`${calculatedURL}/test.json`)
      .then(response => {
        console.log("REST API Response Status:", response.status, response.statusText);
        return response.text();
      })
      .then(text => {
        console.log("REST API Response:", text);
      })
      .catch(error => {
        console.error("REST API Error:", error);
      });
      
  } catch (error) {
    console.error("Error in logFirebaseConfig:", error);
  }
}
