import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Members from "@/pages/members";
import Dashboard from "@/pages/dashboard";
import MembersList from "@/pages/members-list";
import MemberAdd from "@/pages/member-add";
import Export from "@/pages/export";
import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "./lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import React from 'react';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-gray-50/80 relative">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-4 md:p-6 w-full max-w-screen overflow-x-hidden pt-20 md:pt-6">
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
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#963E56] mx-auto"></div>
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
      <Route path="/register" component={Register} />
      <Route path="/" component={() => <PrivateRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <PrivateRoute component={Dashboard} />} />
      <Route path="/members" component={() => <PrivateRoute component={MembersList} />} />
      <Route path="/member/add" component={() => <PrivateRoute component={MemberAdd} />} />
      <Route path="/member/edit/:id" component={() => <PrivateRoute component={MemberAdd} />} />
      <Route path="/export" component={() => <PrivateRoute component={Export} />} />
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