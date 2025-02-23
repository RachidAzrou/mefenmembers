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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 space-y-12">
        <div className="text-center space-y-6">
          <img 
            src="/static/Naamloos.png" 
            alt="MEFEN" 
            className="w-32 mx-auto transform hover:scale-105 transition-transform duration-300"
          />
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Welkom terug
            </h2>
            <p className="mt-2 text-gray-600">
              Log in om door te gaan
            </p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#D9A347]" />
              <Input
                type="email"
                placeholder="E-mailadres"
                className="h-12 pl-10 border-gray-300 focus:border-[#D9A347] focus:ring-[#D9A347] rounded-xl"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">
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
                className="h-12 pl-10 border-gray-300 focus:border-[#D9A347] focus:ring-[#D9A347] rounded-xl"
                {...form.register("password")}
              />
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-red-500">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium bg-[#D9A347] hover:bg-[#C79235] rounded-xl"
          >
            Inloggen
          </Button>
        </form>

        <div className="h-px bg-gray-200" />

        <p className="text-center text-sm text-gray-600">
          MEFEN Vrijwilligers Management Systeem
        </p>
      </div>
    </div>
  );
}