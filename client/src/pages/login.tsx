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

  // Option 1: Current Centered Card Layout with Gradient
  const CenteredCardLayout = (
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
      </div>

      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#D9A347]/20 via-transparent to-black/30 animate-gradient-shift" />
    </div>
  );

  // Option 2: Split Screen Layout
  const SplitScreenLayout = (
    <div className="min-h-screen flex">
      {/* Left side: Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img 
          src="/static/123.jpg" 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center justify-center">
          <div className="px-12 text-white space-y-6">
            <img 
              src="/static/Naamloos.png" 
              alt="MEFEN" 
              className="w-48 mb-8"
            />
            <h1 className="text-5xl font-bold">Welkom bij MEFEN</h1>
            <p className="text-xl text-gray-200 max-w-md">
              Beheer uw vrijwilligers, ruimtes en planning op één plek
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden">
              <img 
                src="/static/Naamloos.png" 
                alt="MEFEN" 
                className="w-32 mx-auto mb-6"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Log in op uw account
            </h2>
            <p className="mt-2 text-gray-600">
              Voer uw gegevens in om door te gaan
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#D9A347]" />
                <Input
                  type="email"
                  placeholder="E-mailadres"
                  className="h-12 pl-10 border-gray-300 focus:border-[#D9A347] focus:ring-[#D9A347]"
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
                  className="h-12 pl-10 border-gray-300 focus:border-[#D9A347] focus:ring-[#D9A347]"
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
              className="w-full h-12 text-base font-medium bg-[#D9A347] hover:bg-[#C79235]"
            >
              Inloggen
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  // Option 3: Minimalist Layout
  const MinimalistLayout = (
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

  // Return the desired layout
  // return CenteredCardLayout; // Current layout
  return SplitScreenLayout; // Split screen layout
  // return MinimalistLayout; // Minimalist layout
}