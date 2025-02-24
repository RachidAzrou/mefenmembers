import { ref, push, serverTimestamp } from "firebase/database";
import { db, auth } from "@/lib/firebase";

export type UserAction = {
  userId: string;
  userEmail: string;
  action: string;
  details?: string;
  timestamp: string;
};

export async function logUserAction(action: string, details?: string) {
  const user = auth.currentUser;
  if (!user) return;

  const logEntry: UserAction = {
    userId: user.uid,
    userEmail: user.email || 'unknown',
    action,
    details,
    timestamp: new Date().toISOString(),
  };

  try {
    await push(ref(db, "user_logs"), logEntry);
  } catch (error) {
    console.error("Failed to log user action:", error);
  }
}