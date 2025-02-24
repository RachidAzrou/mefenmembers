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
