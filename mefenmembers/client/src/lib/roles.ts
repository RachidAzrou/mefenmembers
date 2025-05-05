import { User } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { db } from "./firebase";

export type UserRole = 'gebruiker';

export async function createUserInDatabase(user: User) {
  try {
    const userRef = ref(db, `users/${user.uid}`);
    await set(userRef, {
      email: user.email,
      // Alle gebruikers hebben dezelfde rechten
      role: 'gebruiker'
    });
    console.log(`Created user ${user.email} in database`);
    return true;
  } catch (error) {
    console.error('Error creating user in database:', error);
    return false;
  }
}

// Deze functie behouden we met dezelfde naam maar alle gebruikers krijgen gelijke rechten
export async function createAdminUser(uid: string, email: string) {
  try {
    const userRef = ref(db, `users/${uid}`);
    await set(userRef, {
      email,
      role: 'gebruiker'
    });
    console.log(`Created user ${email} in database`);
    return true;
  } catch (error) {
    console.error('Error creating user in database:', error);
    return false;
  }
}

// Deze functie behouden we met dezelfde naam maar doet niets meer met verschillende rechten
export async function updateUserRole(uid: string, email: string, isAdmin: boolean) {
  try {
    const userRef = ref(db, `users/${uid}`);
    await set(userRef, {
      email,
      role: 'gebruiker'
    });
    console.log(`Updated user ${email} settings`);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

export async function getUserRole(user: User | null): Promise<UserRole | null> {
  if (!user) return null;

  try {
    // Get user data from Firebase Realtime Database
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val();

    console.log('Checking role for user:', user.email);
    console.log('User UID:', user.uid);
    console.log('Database path:', `users/${user.uid}`);
    console.log('User data from Firebase:', userData);

    // Alle bestaande gebruikers hebben dezelfde rechten
    return userData ? 'gebruiker' : null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

// Deze functies houden we aan voor backwards compatibiliteit, maar ze geven altijd hetzelfde terug
export function isAdmin(role: UserRole | null): boolean {
  return role === 'gebruiker'; // Iedereen heeft dezelfde rechten
}

export function isMedewerker(role: UserRole | null): boolean {
  return role === 'gebruiker'; // Iedereen heeft dezelfde rechten
}

// Helper function to check page access
export function canAccessPage(role: UserRole | null, page: string): boolean {
  if (!role) return false;
  
  // Alle pagina's zijn toegankelijk voor alle gebruikers
  return true;
}