import { User } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { db } from "./firebase";

export type UserRole = 'admin' | 'medewerker';

export async function createUserInDatabase(user: User) {
  try {
    const userRef = ref(db, `users/${user.uid}`);
    await set(userRef, {
      email: user.email,
      admin: false, // default to medewerker
    });
    console.log(`Created user ${user.email} in database`);
    return true;
  } catch (error) {
    console.error('Error creating user in database:', error);
    return false;
  }
}

export async function setUserAsAdmin(userEmail: string) {
  try {
    // Get all users
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    // Find user by email
    const userEntry = Object.entries(users || {}).find(([_, userData]: [string, any]) => 
      userData.email === userEmail
    );

    if (userEntry) {
      const [userId, userData] = userEntry;
      // Update user with admin flag
      await set(ref(db, `users/${userId}`), {
        ...userData,
        admin: true
      });
      console.log(`User ${userEmail} has been set as admin`);
      return true;
    } else {
      console.error(`User ${userEmail} not found in database`);
      return false;
    }
  } catch (error) {
    console.error('Error setting user as admin:', error);
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
    console.log('Admin status:', userData?.admin);

    // Check if user has admin flag
    if (userData && userData.admin === true) {
      return 'admin';
    }

    // If user exists but is not admin, they are a medewerker
    return userData ? 'medewerker' : null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

export function isAdmin(role: UserRole | null): boolean {
  return role === 'admin';
}

export function isMedewerker(role: UserRole | null): boolean {
  return role === 'medewerker';
}

// Helper function to check page access
export function canAccessPage(role: UserRole | null, page: string): boolean {
  if (!role) return false;

  // Pages only accessible to admins
  const adminOnlyPages = ['/rooms', '/materials/manage', '/mosque/edit'];
  if (adminOnlyPages.includes(page)) {
    return isAdmin(role);
  }

  // All other pages are accessible to both roles
  return true;
}