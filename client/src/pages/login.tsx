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
      className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center relative py-8 px-4"
      style={{ 
        backgroundImage: `url('/static/123.jpg')`
      }}
    >
      {/* Dark overlay with increased opacity for better readability */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-[680px]">
        {/* Login Card with increased width and padding */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
          <CardContent className="p-8 md:p-10">
            {/* Logo Section */}
            <div className="text-center mb-10">
              <div className="w-full flex justify-center items-center">
                <img 
                  src="/static/Naamloos.png" 
                  alt="MEFEN" 
                  className="h-20 mx-auto mb-6"
                />
              </div>
              <h1 className="text-3xl font-bold text-[#963E56] mb-3">
                Vrijwilligersbeheer
              </h1>
              <p className="text-gray-600 text-lg">
                Log in om de vrijwilligers te beheren
              </p>
            </div>

            {/* Login Form with improved spacing and styling */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-[#963E56]" />
                    <Input
                      type="email"
                      placeholder="E-mailadres"
                      className="h-12 pl-12 border-2 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] rounded-lg text-base transition-all duration-200"
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
                    <LockKeyhole className="absolute left-4 top-3.5 h-5 w-5 text-[#963E56]" />
                    <Input
                      type="password"
                      placeholder="Wachtwoord"
                      className="h-12 pl-12 border-2 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] rounded-lg text-base transition-all duration-200"
                      {...form.register("password")}
                    />
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500 pl-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-[#963E56] hover:bg-[#963E56]/90 transition-colors duration-300 rounded-lg"
              >
                Inloggen
              </Button>
            </form>

            {/* Registration Section with improved styling */}
            <div className="mt-12 pt-8 border-t-2 border-gray-100">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Wil je vrijwilliger worden bij MEFEN?
                </h2>
                <p className="text-gray-600 text-base max-w-md mx-auto">
                  Word onderdeel van onze gemeenschap en help mee aan het versterken van onze moskee.
                </p>
                <Button
                  variant="outline"
                  className="mt-2 w-full h-12 border-2 border-[#963E56] text-[#963E56] hover:bg-[#963E56] hover:text-white transition-all duration-300 rounded-lg font-semibold"
                  onClick={() => setLocation("/register")}
                >
                  Registreer je als vrijwilliger
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer text with improved visibility */}
        <p className="text-center text-sm text-white/90 mt-6 font-medium">
          MEFEN Vrijwilligers Management Systeem
        </p>
      </div>
    </div>
  );
}