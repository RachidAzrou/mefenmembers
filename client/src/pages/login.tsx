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
    <div className="min-h-screen flex">
      {/* Left side: Background image with gradient overlay */}
      <div className="hidden md:block md:w-1/2 relative">
        <img 
          src="/static/123.jpg" 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent">
          <div className="flex flex-col items-center justify-center h-full px-8">
            <img 
              src="/static/Naamloos.png" 
              alt="MEFEN" 
              className="w-40 mb-8 hover:scale-105 transition-transform duration-300"
            />
            <h1 className="text-4xl font-bold text-white text-center mb-4">
              Welkom bij MEFEN
            </h1>
            <p className="text-xl text-gray-200 text-center max-w-md">
              Beheer uw vrijwilligers en ruimtes op één centrale plek
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden text-center mb-8">
            <img 
              src="/static/Naamloos.png" 
              alt="MEFEN" 
              className="w-32 mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900">
              Welkom bij MEFEN
            </h2>
          </div>

          <Card className="border-0 shadow-xl bg-white">
            <CardContent className="pt-6">
              <h3 className="text-xl font-medium text-gray-900 mb-6">
                Log in op uw account
              </h3>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#D9A347]" />
                    <Input
                      type="email"
                      placeholder="E-mailadres"
                      className="h-12 pl-10 border-gray-200 focus:border-[#D9A347] focus:ring-[#D9A347] transition-all duration-200"
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
                    <LockKeyhole className="absolute left-3 top-3.5 h-5 w-5 text-[#D9A347]" />
                    <Input
                      type="password"
                      placeholder="Wachtwoord"
                      className="h-12 pl-10 border-gray-200 focus:border-[#D9A347] focus:ring-[#D9A347] transition-all duration-200"
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
                  className="w-full h-12 text-base font-medium bg-[#D9A347] hover:bg-[#C79235] transition-colors duration-300"
                >
                  Inloggen
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-600 mt-8">
            MEFEN Vrijwilligers Management Systeem
          </p>
        </div>
      </div>
    </div>
  );
}