import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const registerSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { toast } = useToast();
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await push(ref(db, "pending_volunteers"), {
        ...data,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      });

      toast({
        title: "Succesvol verzonden",
        description: "Je aanmelding is ontvangen en wordt bekeken door de beheerder.",
      });
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is iets misgegaan bij het verzenden van je aanmelding.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center relative p-4"
         style={{ backgroundImage: `url('/static/123.jpg')` }}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-[500px] px-4">
        <Card className="bg-white border-0 shadow-2xl overflow-hidden">
          <CardContent className="pt-6 px-8">
            <div className="text-center mb-8">
              <div className="w-full flex justify-center items-center">
                <img 
                  src="/static/Naamloos.png" 
                  alt="MEFEN" 
                  className="h-24 mx-auto mb-4"
                />
              </div>
              <h1 className="text-2xl font-bold text-[#963E56]">
                Word Vrijwilliger
              </h1>
              <p className="text-gray-600 mt-2">
                Vul het formulier in om je aan te melden als vrijwilliger
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voornaam</FormLabel>
                      <FormControl>
                        <Input placeholder="Voornaam" className="h-12 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Achternaam</FormLabel>
                      <FormControl>
                        <Input placeholder="Achternaam" className="h-12 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefoonnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefoonnummer" className="h-12 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full h-12 text-base font-medium bg-[#963E56] hover:bg-[#963E56]/90 transition-colors duration-300">
                  Aanmelden
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-300 mt-6">
          MEFEN Vrijwilligers Management Systeem
        </p>
      </div>
    </div>
  );
}