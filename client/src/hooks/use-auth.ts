import { createContext, ReactNode, useContext } from "react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

type AuthContextType = {
  user: any | null;
  isLoading: boolean;
  error: Error | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  error: null
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, isLoading, error] = useAuthState(auth);

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    error: error ?? null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}