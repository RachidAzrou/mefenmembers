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

export default function Login() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const form = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-10 p-4 w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <img 
            src="/static/Naamloos.png" 
            alt="MEFEN" 
            className="h-28 mx-auto bg-white/90 rounded-lg p-4 backdrop-blur-sm"
          />
          <h2 className="mt-6 text-3xl font-bold text-white">
            Welkom bij MEFEN
          </h2>
          <p className="mt-2 text-lg text-gray-200">
            Log in om door te gaan
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-white/95">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="E-mailadres"
                    className="h-12 pl-10"
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
                  <LockKeyhole className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Wachtwoord"
                    className="h-12 pl-10"
                    {...form.register("password")}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500 pl-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium">
                Inloggen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}