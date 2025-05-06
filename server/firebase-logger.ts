import { ref, set, push, serverTimestamp } from "firebase/database";
import { getDatabase } from "firebase/database";
import { initializeApp } from "firebase/app";
import { Member } from "@shared/schema";

// Zorg ervoor dat de Firebase omgevingsvariabelen beschikbaar zijn
// Als de server-side variabelen niet bestaan, gebruik dan de client-side (VITE_) variabelen
if (!process.env.FIREBASE_API_KEY && process.env.VITE_FIREBASE_API_KEY) {
  process.env.FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;
}
if (!process.env.FIREBASE_PROJECT_ID && process.env.VITE_FIREBASE_PROJECT_ID) {
  process.env.FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
}
if (!process.env.FIREBASE_DATABASE_URL && process.env.VITE_FIREBASE_DATABASE_URL) {
  process.env.FIREBASE_DATABASE_URL = process.env.VITE_FIREBASE_DATABASE_URL;
}
if (!process.env.FIREBASE_APP_ID && process.env.VITE_FIREBASE_APP_ID) {
  process.env.FIREBASE_APP_ID = process.env.VITE_FIREBASE_APP_ID;
}

// Firebase configuratie voor server-side gebruik
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
  appId: process.env.FIREBASE_APP_ID,
};

// Firebase initialiseren
const app = initializeApp(firebaseConfig, 'server');
const database = getDatabase(app);

// Type definities voor activiteitenlog
export type ActivityType = 'create' | 'update' | 'delete';

export interface ActivityLog {
  action: ActivityType;
  timestamp: any; // Firebase serverTimestamp
  memberId: number;
  memberNumber: number;
  memberName: string;
  details?: any;
  changedBy?: string; // Voor toekomstige authenticatie
}

/**
 * Logt een activiteit in Firebase Realtime Database
 */
export async function logActivity(activity: Omit<ActivityLog, 'timestamp'>) {
  try {
    const activityRef = ref(database, 'activities');
    const newActivityRef = push(activityRef);
    
    await set(newActivityRef, {
      ...activity,
      timestamp: serverTimestamp()
    });
    
    console.log(`Activity logged: ${activity.action} for member ${activity.memberName}`);
    return true;
  } catch (error) {
    console.error('Error logging activity to Firebase:', error);
    return false;
  }
}

/**
 * Synchroniseert een lid met Firebase Realtime Database
 */
export async function syncMemberToFirebase(member: Member, action: ActivityType) {
  try {
    // Sla het lid op in de "members" node
    const memberRef = ref(database, `members/${member.id}`);
    
    if (action === 'delete') {
      // Verwijder het lid uit Firebase als het is verwijderd
      await set(memberRef, null);
    } else {
      // Update of maak het lid aan in Firebase
      await set(memberRef, {
        ...member,
        lastUpdated: serverTimestamp()
      });
    }
    
    // Log de activiteit
    await logActivity({
      action,
      memberId: member.id,
      memberNumber: member.memberNumber,
      memberName: `${member.firstName} ${member.lastName}`,
      details: action === 'update' ? { updatedFields: Object.keys(member) } : undefined
    });
    
    return true;
  } catch (error) {
    console.error(`Error syncing member to Firebase (${action}):`, error);
    return false;
  }
}