import { ref, push } from "firebase/database";
import { db, auth } from "@/lib/firebase";

export type UserAction = {
  userId: string;
  userEmail: string;
  action: string;
  details?: string;
  timestamp: string;
  targetType?: string; // 'volunteer', 'material', 'schedule', etc.
  targetId?: string;   // ID of the affected item
  targetName?: string; // Name/description of the affected item
};

export async function logUserAction(
  action: string,
  details?: string,
  targetInfo?: {
    type?: string;
    id?: string;
    name?: string;
  }
) {
  const user = auth.currentUser;
  if (!user) return;

  const logEntry: UserAction = {
    userId: user.uid,
    userEmail: user.email || 'unknown',
    action,
    details,
    timestamp: new Date().toISOString(),
    ...(targetInfo && {
      targetType: targetInfo.type,
      targetId: targetInfo.id,
      targetName: targetInfo.name,
    }),
  };

  try {
    await push(ref(db, "user_logs"), logEntry);
  } catch (error) {
    console.error("Failed to log user action:", error);
  }
}