import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, ArrowLeft, Loader2 } from "lucide-react";
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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { insertMemberSchema, Member } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form validator schema met alle vereiste velden
const memberFormSchema = insertMemberSchema.extend({
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
  email: z.string().email("Voer een geldig e-mailadres in").optional().or(z.literal('')),
  notes: z.string().optional(),
  birthDate: z.date().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
}).omit({ id: true, memberNumber: true, registrationDate: true });

type FormData = z.infer<typeof memberFormSchema>;

export default function MemberAdd() {
  // Controleer of we een lid aan het bewerken zijn
  const params = useParams<{ id: string }>();
  const isEditMode = Boolean(params.id);
  const memberId = params.id ? parseInt(params.id) : undefined;
  
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
  
  // Ophalen van lidgegevens bij bewerken
  const { data: memberData, isLoading: isLoadingMember } = useQuery<Member>({
    queryKey: [`/api/members/${memberId}`],
    queryFn: async () => {
      if (!memberId) return undefined;
      const response = await apiRequest('GET', `/api/members/${memberId}`);
      return await response.json();
    },
    enabled: isEditMode && memberId !== undefined,
  });
  
  // Update formulier met bestaande gegevens bij bewerken
  useEffect(() => {
    if (memberData) {
      // Converteer datum strings naar Date objecten
      const birthDate = memberData.birthDate ? new Date(memberData.birthDate) : null;
      
      form.reset({
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        email: memberData.email || "",
        phoneNumber: memberData.phoneNumber,
        paymentStatus: memberData.paymentStatus || false,
        notes: memberData.notes || "",
        birthDate: birthDate,
        accountNumber: memberData.accountNumber || "",
      });
    }
  }, [memberData, form]);
  
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
  
  // Mutation om een bestaand lid bij te werken
  const updateMemberMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!memberId) throw new Error('Geen lid-ID gevonden om bij te werken');
      
      const response = await apiRequest('PUT', `/api/members/${memberId}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Update de cache en navigeer naar de ledenlijst
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      queryClient.invalidateQueries({ queryKey: [`/api/members/${memberId}`] });
      toast({
        title: 'Lid bijgewerkt',
        description: "De gegevens van het lid zijn succesvol bijgewerkt.",
      });
      navigate('/members');
    },
    onError: (error) => {
      toast({
        title: 'Fout bij bijwerken',
        description: `Er is een fout opgetreden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Behandel het versturen van het formulier
  async function onSubmit(data: FormData) {
    if (isEditMode) {
      updateMemberMutation.mutate(data);
    } else {
      // Stuur vereenvoudigde data direct naar API, laat server het lidnummer genereren
      // Dit elimineert een extra API-aanroep en maakt het proces sneller
      const completeData = {
        ...data,
        registrationDate: new Date()
      };
      
      // Toon onmiddellijk een toast dat het proces is gestart
      toast({
        title: "Lid wordt toegevoegd",
        description: "Even geduld...",
      });
      
      // Start de mutatie direct
      createMemberMutation.mutate(completeData);
    }
  }
  
  const isPending = createMemberMutation.isPending || updateMemberMutation.isPending;
  
  return (
    <div className="space-y-6">
      {/* Header met gradient achtergrond - responsief */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-4 sm:p-6 shadow-md text-white">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isEditMode ? "Lid bewerken" : "Nieuw lid toevoegen"}
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            {isEditMode 
              ? "Bewerk de gegevens van het bestaande lid."
              : "Voeg een nieuw lid toe aan de MEFEN ledenadministratie."}
          </p>
        </div>
      </div>
      
      {/* Laad indicator tijdens het ophalen van gegevens */}
      {isEditMode && isLoadingMember && (
        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-100">
          <Loader2 className="h-6 w-6 text-[#963E56] animate-spin mr-2" />
          <p>Bezig met laden van lidgegevens...</p>
        </div>
      )}
      
      <div>
        {/* Formulier */}
        <Card className="border-none shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
          <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#963E56]">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Lid gegevens
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {isEditMode 
                ? "Wijzig de gegevens van het lid. Velden met een " 
                : "Vul alle vereiste informatie in om een nieuw lid toe te voegen. Velden met een "}
              <span className="text-destructive">*</span> zijn verplicht.
            </CardDescription>
            
            {/* Debug informatie */}
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <h4 className="font-medium text-red-800 mb-1">Form validation errors:</h4>
                <pre className="text-xs overflow-auto text-red-700">
                  {JSON.stringify(form.formState.errors, null, 2)}
                </pre>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
                {/* Persoonlijke informatie met verbeterde styling */}
                <div>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="mr-2 bg-[#963E56]/10 p-1.5 sm:p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#963E56]">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-700">Persoonlijke gegevens</h3>
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
                    render={({ field }) => {
                      const [isOpen, setIsOpen] = React.useState(false);
                      
                      // Parse de huidige waarde naar dag, maand en jaar componenten
                      const currentDate = field.value ? new Date(field.value) : null;
                      const currentYear = currentDate ? currentDate.getFullYear() : null;
                      const currentMonth = currentDate ? currentDate.getMonth() : null;
                      const currentDay = currentDate ? currentDate.getDate() : null;
                      
                      // State voor de dropdown waarden
                      const [selectedYear, setSelectedYear] = React.useState<number | null>(currentYear);
                      const [selectedMonth, setSelectedMonth] = React.useState<number | null>(currentMonth);
                      const [selectedDay, setSelectedDay] = React.useState<number | null>(currentDay);
                      
                      // Genereer lijst van jaren (1900 tot huidig jaar)
                      const currentFullYear = new Date().getFullYear();
                      const years = Array.from({ length: currentFullYear - 1899 }, (_, i) => currentFullYear - i);
                      
                      // Maanden lijst
                      const months = [
                        { value: 0, label: "Januari" },
                        { value: 1, label: "Februari" },
                        { value: 2, label: "Maart" },
                        { value: 3, label: "April" },
                        { value: 4, label: "Mei" },
                        { value: 5, label: "Juni" },
                        { value: 6, label: "Juli" },
                        { value: 7, label: "Augustus" },
                        { value: 8, label: "September" },
                        { value: 9, label: "Oktober" },
                        { value: 10, label: "November" },
                        { value: 11, label: "December" }
                      ];
                      
                      // Bereken het aantal dagen in de geselecteerde maand
                      const getDaysInMonth = (year: number | null, month: number | null) => {
                        if (year === null || month === null) return 31;
                        return new Date(year, month + 1, 0).getDate();
                      };
                      
                      // Genereer lijst van dagen
                      const daysInMonth = selectedYear && selectedMonth !== null ? 
                        getDaysInMonth(selectedYear, selectedMonth) : 31;
                      
                      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                      
                      // Update het veld wanneer dropdown waarden veranderen
                      React.useEffect(() => {
                        if (selectedYear !== null && selectedMonth !== null && selectedDay !== null) {
                          const newDate = new Date(selectedYear, selectedMonth, selectedDay);
                          // Alleen updaten als het een geldige datum is
                          if (!isNaN(newDate.getTime()) && 
                              newDate >= new Date(1900, 0, 1) && 
                              newDate <= new Date()) {
                            field.onChange(newDate);
                          }
                        }
                      }, [selectedYear, selectedMonth, selectedDay, field]);
                      
                      // Update de dropdown waarden wanneer het veld verandert
                      React.useEffect(() => {
                        if (field.value) {
                          const date = new Date(field.value);
                          setSelectedYear(date.getFullYear());
                          setSelectedMonth(date.getMonth());
                          setSelectedDay(date.getDate());
                        }
                      }, [field.value]);
                      
                      // Formatteer de datum voor weergave in de knop
                      const formattedDate = field.value ? format(field.value, "dd MMMM yyyy", { locale: nl }) : "Kies een datum";
                      
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Geboortedatum</FormLabel>
                          <Popover open={isOpen} onOpenChange={setIsOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={isOpen}
                                  className={cn(
                                    "w-full justify-between border-gray-200 hover:bg-gray-50",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {formattedDate}
                                  <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="start">
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                  {/* Dag selectie */}
                                  <div className="space-y-1">
                                    <Label htmlFor="birth-day" className="text-xs text-gray-500">Dag</Label>
                                    <Select
                                      value={selectedDay?.toString() || "placeholder"}
                                      onValueChange={(value) => {
                                        if (value !== "placeholder") {
                                          setSelectedDay(parseInt(value, 10));
                                        }
                                      }}
                                    >
                                      <SelectTrigger id="birth-day" className="h-8">
                                        <SelectValue placeholder="Dag" />
                                      </SelectTrigger>
                                      <SelectContent position="popper" className="max-h-[200px]">
                                        {days.map((day) => (
                                          <SelectItem key={`day-${day}`} value={day.toString()}>
                                            {day}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Maand selectie */}
                                  <div className="space-y-1">
                                    <Label htmlFor="birth-month" className="text-xs text-gray-500">Maand</Label>
                                    <Select
                                      value={selectedMonth?.toString() || "placeholder"}
                                      onValueChange={(value) => {
                                        if (value !== "placeholder") {
                                          const monthValue = parseInt(value, 10);
                                          setSelectedMonth(monthValue);
                                          
                                          // Pas de dag aan als de nieuwe maand minder dagen heeft
                                          if (selectedYear !== null && selectedDay !== null) {
                                            const daysInNewMonth = getDaysInMonth(selectedYear, monthValue);
                                            if (selectedDay > daysInNewMonth) {
                                              setSelectedDay(daysInNewMonth);
                                            }
                                          }
                                        }
                                      }}
                                    >
                                      <SelectTrigger id="birth-month" className="h-8">
                                        <SelectValue placeholder="Maand" />
                                      </SelectTrigger>
                                      <SelectContent position="popper" className="max-h-[200px]">
                                        {months.map((month) => (
                                          <SelectItem key={`month-${month.value}`} value={month.value.toString()}>
                                            {month.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Jaar selectie */}
                                  <div className="space-y-1">
                                    <Label htmlFor="birth-year" className="text-xs text-gray-500">Jaar</Label>
                                    <Select
                                      value={selectedYear?.toString() || "placeholder"}
                                      onValueChange={(value) => {
                                        if (value !== "placeholder") {
                                          const yearValue = parseInt(value, 10);
                                          setSelectedYear(yearValue);
                                          
                                          // Pas de dag aan voor schrikkeljaren
                                          if (selectedMonth === 1 && selectedDay !== null) { // Februari
                                            const daysInNewMonth = getDaysInMonth(yearValue, 1);
                                            if (selectedDay > daysInNewMonth) {
                                              setSelectedDay(daysInNewMonth);
                                            }
                                          }
                                        }
                                      }}
                                    >
                                      <SelectTrigger id="birth-year" className="h-8">
                                        <SelectValue placeholder="Jaar" />
                                      </SelectTrigger>
                                      <SelectContent position="popper" className="max-h-[200px]">
                                        {years.map((year) => (
                                          <SelectItem key={`year-${year}`} value={year.toString()}>
                                            {year}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                {/* Knoppenbalk */}
                                <div className="flex justify-between">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      field.onChange(null);
                                      setSelectedYear(null);
                                      setSelectedMonth(null);
                                      setSelectedDay(null);
                                      setIsOpen(false);
                                    }}
                                    className="text-xs"
                                  >
                                    Wissen
                                  </Button>
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    onClick={() => setIsOpen(false)}
                                    className="bg-[#963E56] hover:bg-[#963E56]/90 text-white text-xs"
                                  >
                                    Toepassen
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormDescription className="text-xs sm:text-sm">
                            Selecteer de geboortedatum van het lid.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
                
                {/* Contactinformatie met verbeterde styling */}
                <div>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="mr-2 bg-blue-50 p-1.5 sm:p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-700">Contactgegevens</h3>
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
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="mr-2 bg-green-50 p-1.5 sm:p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-700">Financiële gegevens</h3>
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
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="mr-2 bg-purple-50 p-1.5 sm:p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                        <line x1="9" y1="9" x2="10" y2="9" />
                        <line x1="9" y1="13" x2="15" y2="13" />
                        <line x1="9" y1="17" x2="15" y2="17" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-700">Extra informatie</h3>
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
                
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 sm:pt-2">
                  {/* Test knop voor debug */}
                  <Button 
                    type="button" 
                    variant="secondary"
                    className="order-3 w-full sm:w-auto mb-3 sm:mb-0"
                    onClick={() => {
                      console.log("Test knop geklikt");
                      console.log("Form state:", form.getValues());
                      console.log("Form errors:", form.formState.errors);
                      console.log("Form is valid:", form.formState.isValid);
                    }}
                  >
                    <span className="mr-2">🔍</span> Test Formulier
                  </Button>
                
                  <Button 
                    type="button"
                    variant="outline"
                    className="border-gray-200 order-2 sm:order-1 w-full sm:w-auto"
                    onClick={() => navigate('/members')}
                  >
                    Annuleren
                  </Button>
                  
                  <Button 
                    type="submit" 
                    className="bg-[#963E56] hover:bg-[#963E56]/90 text-white order-1 sm:order-2 w-full sm:w-auto"
                    disabled={isPending}
                    onClick={() => {
                      console.log("Submit knop geklikt - voor submit handler");
                    }}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="whitespace-nowrap">
                          {isEditMode ? "Bezig met bijwerken..." : "Bezig met toevoegen..."}
                        </span>
                      </>
                    ) : (
                      isEditMode ? "Lid bijwerken" : "Lid toevoegen"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}