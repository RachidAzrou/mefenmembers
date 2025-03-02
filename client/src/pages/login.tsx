import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LockKeyhole, Mail, User } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens bevatten"),
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
});

type FormData = z.infer<typeof formSchema>;

export default function Login() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const endpoint = isRegistering ? "/api/register" : "/api/login";
      const payload = isRegistering ? data : {
        email: data.email,
        password: data.password
      };

      const res = await apiRequest("POST", endpoint, payload);
      return await res.json();
    },
    onSuccess: () => {
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      setFormError("Ongeldig e-mailadres of wachtwoord");
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message,
        duration: 3000,
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setFormError(null);
    mutation.mutate(data);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center relative px-4 py-8 md:p-4"
      style={{
        backgroundImage: `url('/static/123.jpg')`
      }}
    >
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-[500px]">
        <Card className="bg-white border-0 shadow-2xl overflow-hidden">
          <CardContent className="pt-8 px-4 sm:px-8">
            <div className="text-center mb-8">
              <div className="w-full flex justify-center items-center">
                <img
                  src="/static/Naamloos.png"
                  alt="MEFEN"
                  className="h-20 sm:h-24 mx-auto mb-6"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#963E56] mb-3">
                Vrijwilligersbeheer
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {isRegistering ? "Registreer om materialen en planningen te beheren" : "Log in om materialen en planningen te beheren"}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {isRegistering && (
                  <>
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#963E56]" />
                            <FormControl>
                              <Input
                                placeholder="Voornaam"
                                className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#963E56]" />
                            <FormControl>
                              <Input
                                placeholder="Achternaam"
                                className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#963E56]" />
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="E-mailadres"
                            className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#963E56]" />
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Wachtwoord"
                            className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {formError && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                    {formError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium bg-[#963E56] hover:bg-[#963E56]/90 transition-colors duration-300"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending 
                    ? (isRegistering ? "Bezig met registreren..." : "Bezig met inloggen...") 
                    : (isRegistering ? "Registreren" : "Inloggen")}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-[#963E56] hover:text-[#963E56]/90"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setFormError(null);
                      form.reset();
                    }}
                  >
                    {isRegistering ? "Al een account? Log in" : "Nog geen account? Registreer"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center space-y-1 mt-6">
          <p className="text-white/90 text-sm font-medium">
            MEFEN Vrijwilligers Management Systeem
          </p>
          <p className="text-white/70 text-xs">
            Versie 2.1.4
          </p>
        </div>
      </div>
    </div>
  );
}