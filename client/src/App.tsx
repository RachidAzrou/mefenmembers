import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Volunteers from "@/pages/volunteers";
import Rooms from "@/pages/rooms";
import Materials from "@/pages/materials";
import Planning from "@/pages/planning";
import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "./lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 w-full max-w-[100vw] overflow-x-hidden">
        <div className="container mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <AuthenticatedLayout>
      <Component />
    </AuthenticatedLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <PrivateRoute component={Dashboard} />} />
      <Route path="/planning" component={() => <PrivateRoute component={Planning} />} />
      <Route path="/volunteers" component={() => <PrivateRoute component={Volunteers} />} />
      <Route path="/rooms" component={() => <PrivateRoute component={Rooms} />} />
      <Route path="/materials" component={() => <PrivateRoute component={Materials} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;