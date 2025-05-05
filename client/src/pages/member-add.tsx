import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { insertMemberSchema } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

// Form validator schema met alle vereiste velden
const memberFormSchema = insertMemberSchema.extend({
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
  email: z.string().email("Voer een geldig e-mailadres in").optional().or(z.literal('')),
  notes: z.string().optional(),
  birthDate: z.date().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
}).omit({ id: true, registrationDate: true, memberNumber: true });

type FormData = z.infer<typeof memberFormSchema>;

export default function MemberAdd() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  
  // Form setup met react-hook-form en zod validatie
  const form = useForm<FormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      paymentStatus: false,
      notes: "",
      birthDate: null,
      accountNumber: ""
    }
  });
  
  // Mutation om een nieuw lid aan te maken
  const createMemberMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/members", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Lid toegevoegd",
        description: "Het lid is succesvol toegevoegd.",
      });
      navigate("/members");
    },
    onError: (error) => {
      toast({
        title: "Fout bij toevoegen",
        description: `Er is een fout opgetreden: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Behandel het versturen van het formulier
  function onSubmit(data: FormData) {
    createMemberMutation.mutate(data);
  }
  
  return (
    <div className="space-y-6">
      {/* Header met gradient achtergrond */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md text-white">
        <div className="flex items-center gap-3">
          <Link href="/members">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nieuw lid toevoegen</h1>
            <p className="text-white/80">
              Voeg een nieuw lid toe aan de MEFEN ledenadministratie.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-5 gap-6">
        {/* Formulier in linker 3 kolommen */}
        <div className="md:col-span-3">
          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
            <CardHeader className="pb-6">
              <CardTitle className="text-xl flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-[#963E56]">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Lid gegevens
              </CardTitle>
              <CardDescription>
                Vul alle vereiste informatie in om een nieuw lid toe te voegen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Persoonlijke informatie met verbeterde styling */}
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="mr-2 bg-[#963E56]/10 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#963E56]">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700">Persoonlijke gegevens</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Voornaam<span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Voornaam" className="border-gray-200 focus:border-[#963E56]" {...field} />
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
                            <FormLabel>Achternaam<span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Achternaam" className="border-gray-200 focus:border-[#963E56]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Geboortedatum</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal border-gray-200",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMMM yyyy", { locale: nl })
                                  ) : (
                                    <span>Kies een datum</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Selecteer de geboortedatum van het lid.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Contactinformatie met verbeterde styling */}
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="mr-2 bg-blue-50 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700">Contactgegevens</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefoonnummer<span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Telefoonnummer" className="border-gray-200 focus:border-[#963E56]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="E-mail (optioneel)" className="border-gray-200 focus:border-[#963E56]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Financiële informatie met verbeterde styling */}
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="mr-2 bg-green-50 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-600">
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700">Financiële gegevens</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => {
                          // Zorg ervoor dat de waarde nooit null is
                          const value = field.value === null ? "" : field.value;
                          return (
                            <FormItem>
                              <FormLabel>Rekeningnummer</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Rekeningnummer (optioneel)" 
                                  className="border-gray-200 focus:border-[#963E56]" 
                                  value={value}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              <FormDescription>
                                Het bankrekeningnummer van het lid (optioneel).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      
                      <FormField
                        control={form.control}
                        name="paymentStatus"
                        render={({ field }) => (
                          <FormItem className="bg-gray-50 p-4 rounded-md flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Ledenbijdrage betaald</FormLabel>
                              <FormDescription>
                                Geef aan of dit lid de ledenbijdrage heeft betaald.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Notities met verbeterde styling */}
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="mr-2 bg-purple-50 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-purple-600">
                          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                          <line x1="9" y1="9" x2="10" y2="9" />
                          <line x1="9" y1="13" x2="15" y2="13" />
                          <line x1="9" y1="17" x2="15" y2="17" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700">Extra informatie</h3>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notities</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Voeg eventuele extra informatie toe over dit lid..." 
                              className="min-h-[120px] border-gray-200 focus:border-[#963E56]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-3 justify-end pt-2">
                    <Link href="/members">
                      <Button variant="outline" type="button" className="border-gray-200">Annuleren</Button>
                    </Link>
                    <Button 
                      type="submit" 
                      className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
                      disabled={createMemberMutation.isPending}
                    >
                      {createMemberMutation.isPending ? "Bezig met toevoegen..." : "Lid toevoegen"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        {/* Informatieve sectie in rechter 2 kolommen */}
        <div className="md:col-span-2">
          <Card className="border-none shadow-md bg-gradient-to-r from-[#963E56]/5 to-white overflow-hidden sticky top-6">
            <div className="bg-[#963E56]/70 h-1" />
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#963E56]">Informatie</CardTitle>
              <CardDescription>Wat u moet weten bij het toevoegen van een lid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                <div className="font-medium text-blue-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  Belangrijk
                </div>
                <p className="text-sm text-blue-600">
                  Alle velden met een <span className="text-destructive">*</span> zijn verplicht. 
                  Een uniek lidnummer wordt automatisch gegenereerd.
                </p>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-900">Wat gebeurt er na toevoegen?</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-green-100 text-green-700 h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs">1</span>
                    </div>
                    <p className="text-gray-600">
                      Het lid wordt toegevoegd aan de database met een uniek lidnummer.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-green-100 text-green-700 h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs">2</span>
                    </div>
                    <p className="text-gray-600">
                      U kunt de gegevens van het lid op elk moment bekijken en bewerken via de ledenlijst.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-green-100 text-green-700 h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs">3</span>
                    </div>
                    <p className="text-gray-600">
                      De registratiedatum wordt automatisch ingesteld op vandaag.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg p-4 border border-gray-100 space-y-1 bg-white">
                <h4 className="font-medium text-sm text-gray-900">Hulp nodig?</h4>
                <p className="text-xs text-gray-500">
                  Neem contact op met de beheerder als u vragen heeft over het toevoegen van leden.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}