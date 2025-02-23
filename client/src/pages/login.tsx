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
      className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover"
      style={{ 
        backgroundImage: `linear-gradient(to bottom right, rgba(150, 62, 86, 0.9), rgba(150, 62, 86, 0.7)), url('/123.jpg')` 
      }}
    >
      <div className="p-4 w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <img src="/Naamloos.png" alt="MEFEN" className="h-24 mx-auto" />
          <h2 className="mt-6 text-2xl font-semibold text-white">
            Welkom Terug
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Log in om door te gaan
          </p>
        </div>
        <Card className="backdrop-blur-sm bg-white/95">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="E-mailadres"
                  className="h-11"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Wachtwoord"
                  className="h-11"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full h-11 text-base">
                Inloggen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}