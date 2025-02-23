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
      className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center relative"
      style={{ 
        backgroundImage: `url('/static/123.jpg')`
      }}
    >
      {/* Elegant overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 backdrop-blur-[2px]" />

      <div className="relative z-10 p-6 w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="bg-white/95 rounded-xl p-5 shadow-lg backdrop-blur-sm w-32 h-32 mx-auto mb-6 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <img 
              src="/static/Naamloos.png" 
              alt="MEFEN" 
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-4xl font-bold text-white mb-3 text-shadow">
            Welkom bij MEFEN
          </h2>
          <p className="text-xl text-gray-200 text-shadow">
            Log in om door te gaan
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <div className="relative transition-all duration-300 hover:transform hover:translate-y-[-2px]">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#D9A347]" />
                  <Input
                    type="email"
                    placeholder="E-mailadres"
                    className="h-12 pl-10 bg-white/50 backdrop-blur-sm border-gray-200 focus:border-[#D9A347] focus:ring-[#D9A347]"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 pl-1 animate-fadeIn">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative transition-all duration-300 hover:transform hover:translate-y-[-2px]">
                  <LockKeyhole className="absolute left-3 top-3.5 h-5 w-5 text-[#D9A347]" />
                  <Input
                    type="password"
                    placeholder="Wachtwoord"
                    className="h-12 pl-10 bg-white/50 backdrop-blur-sm border-gray-200 focus:border-[#D9A347] focus:ring-[#D9A347]"
                    {...form.register("password")}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500 pl-1 animate-fadeIn">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-[#D9A347] hover:bg-[#C79235] transition-colors duration-300"
              >
                Inloggen
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-300 mt-8">
          MEFEN Vrijwilligers Management Systeem
        </p>
      </div>

      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#D9A347]/20 via-transparent to-black/30 animate-gradient-shift" />
    </div>
  );
}