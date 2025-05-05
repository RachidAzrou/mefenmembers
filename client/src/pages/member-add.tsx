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
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nieuw lid toevoegen</h1>
          <p className="text-muted-foreground">
            Voeg een nieuw lid toe aan de MEFEN ledenadministratie.
          </p>
        </div>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Lid gegevens</CardTitle>
          <CardDescription>Vul alle vereiste informatie in om een nieuw lid toe te voegen.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Persoonlijke informatie */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Persoonlijke gegevens</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voornaam<span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Voornaam" {...field} />
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
                          <Input placeholder="Achternaam" {...field} />
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
                                "w-full pl-3 text-left font-normal",
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
              
              {/* Contactinformatie */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contactgegevens</h3>
                
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefoonnummer<span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Telefoonnummer" {...field} />
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
                        <Input type="email" placeholder="E-mail (optioneel)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Financiële informatie */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Financiële gegevens</h3>
                
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rekeningnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="Rekeningnummer (optioneel)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Het bankrekeningnummer van het lid (optioneel).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
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
              
              {/* Notities */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Extra informatie</h3>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notities</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Voeg eventuele extra informatie toe over dit lid..." 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Link href="/dashboard">
                  <Button variant="outline" type="button">Annuleren</Button>
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
  );
}