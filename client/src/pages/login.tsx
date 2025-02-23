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

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/static/Naamloos.png" 
            alt="MEFEN" 
            className="w-48 h-48 mx-auto mb-6 transform hover:scale-105 transition-transform duration-300"
          />
          <h1 className="text-3xl font-bold text-white">
            Welkom bij MEFEN
          </h1>
        </div>

        {/* Login Card */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#963E56]" />
                  <Input
                    type="email"
                    placeholder="E-mailadres"
                    className="h-12 pl-10 bg-white/80 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
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
                    className="h-12 pl-10 bg-white/80 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
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
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-300 mt-6">
          MEFEN Vrijwilligers Management Systeem
        </p>
      </div>
    </div>
  );
}