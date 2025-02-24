import { User } from "firebase/auth";

export type UserRole = 'admin' | 'medewerker';

export async function getUserRole(user: User | null): Promise<UserRole | null> {
  if (!user) return null;

  // Get custom claims from Firebase Auth
  const token = await user.getIdTokenResult();
  if (token.claims.role) {
    return token.claims.role as UserRole;
  }

  return null;
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