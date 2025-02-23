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
      {/* Left side: Background image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img 
          src="/static/123.jpg" 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center justify-center">
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold mb-4">Welkom bij MEFEN</h1>
            <p className="text-xl max-w-md">
              Beheer uw vrijwilligers, ruimtes en planning op één plek
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="w-full lg:w-1/2 min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        {/* Logo above the card */}
        <div className="mb-8">
          <img 
            src="/static/Naamloos.png" 
            alt="MEFEN" 
            className="w-32 h-32 object-contain transform hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl">
            <CardContent className="pt-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-red-600" />
                    <Input
                      type="email"
                      placeholder="E-mailadres"
                      className="h-12 pl-10 border-gray-200 focus:border-red-600 focus:ring-red-600"
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
                    <LockKeyhole className="absolute left-3 top-3.5 h-5 w-5 text-red-600" />
                    <Input
                      type="password"
                      placeholder="Wachtwoord"
                      className="h-12 pl-10 border-gray-200 focus:border-red-600 focus:ring-red-600"
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
                  className="w-full h-12 text-base font-medium bg-red-600 hover:bg-red-700 transition-colors duration-300"
                >
                  Inloggen
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-600 mt-6">
            MEFEN Vrijwilligers Management Systeem
          </p>
        </div>
      </div>
    </div>
  );
}