import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LockKeyhole, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens bevatten"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Ongeldig e-mailadres of wachtwoord",
      });
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center relative p-4"
      style={{ 
        backgroundImage: `url('/static/123.jpg')`
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-[600px] px-4">
        {/* Login Card */}
        <Card className="bg-white border-0 shadow-2xl overflow-hidden">
          <CardContent className="pt-6 px-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-full flex justify-center items-center">
                <img 
                  src="/static/Naamloos.png" 
                  alt="MEFEN" 
                  className="h-16 mx-auto mb-4"
                />
              </div>
              <h1 className="text-2xl font-bold text-[#963E56]">
                Vrijwilligersbeheer
              </h1>
              <p className="text-gray-600 mt-2">
                Log in om de vrijwilligers te beheren
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#963E56]" />
                  <Input
                    type="email"
                    placeholder="E-mailadres"
                    className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 pl-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-3.5 h-5 w-5 text-[#963E56]" />
                  <Input
                    type="password"
                    placeholder="Wachtwoord"
                    className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                    {...form.register("password")}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500 pl-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-[#963E56] hover:bg-[#963E56]/90 transition-colors duration-300"
              >
                Inloggen
              </Button>
            </form>

            {/* DEBUG ELEMENT */}
            <div style={{ backgroundColor: "red", color: "white", padding: "10px", margin: "10px 0", textAlign: "center" }}>
              DEBUG: Registration Section Start
            </div>

            {/* Registratie sectie */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Wil je vrijwilliger worden bij MEFEN?
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Word onderdeel van onze gemeenschap en help mee aan het versterken van onze moskee.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full border-[#963E56] text-[#963E56] hover:bg-[#963E56] hover:text-white"
                  onClick={() => setLocation("/register")}
                >
                  Registreer je als vrijwilliger
                </Button>
              </div>
            </div>

            {/* DEBUG ELEMENT */}
            <div style={{ backgroundColor: "red", color: "white", padding: "10px", margin: "10px 0", textAlign: "center" }}>
              DEBUG: Registration Section End
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-300 mt-6">
          MEFEN Vrijwilligers Management Systeem
        </p>
      </div>
    </div>
  );
}