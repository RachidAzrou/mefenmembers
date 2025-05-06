import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Loader2, 
  AlertTriangle,
  Trash2,
  UserPlus,
  ScrollText,
  Info as InfoIcon
} from "lucide-react";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
  // Persoonsgegevens
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  gender: z.enum(["man", "vrouw"], {
    required_error: "Selecteer geslacht",
  }),
  birthDate: z.date({
    required_error: "Geboortedatum is verplicht",
  }),
  nationality: z.string().optional().nullable(),
  
  // Contactgegevens
  email: z.string().email("Voer een geldig e-mailadres in").optional().or(z.literal('')),
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
  street: z.string().optional().nullable(),
  houseNumber: z.string().optional().nullable(),
  busNumber: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  
  // Lidmaatschap
  membershipType: z.enum(["standaard", "student", "senior"], {
    required_error: "Selecteer lidmaatschapstype",
  }),
  startDate: z.date({
    required_error: "Startdatum lidmaatschap is verplicht",
  }),
  endDate: z.date().optional().nullable(),
  autoRenew: z.boolean().default(true),
  paymentTerm: z.enum(["maandelijks", "driemaandelijks", "jaarlijks"], {
    required_error: "Selecteer betalingstermijn",
  }),
  paymentMethod: z.enum(["cash", "domiciliering", "overschrijving", "bancontact"], {
    required_error: "Selecteer betalingswijze",
  }),
  
  // Financiën
  accountNumber: z.string().optional().nullable()
    .refine(val => !val || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(val), {
      message: "Ongeldig IBAN formaat. Bijvoorbeeld: BE68539007547034"
    }),
  bicSwift: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  
  // Overig
  privacyConsent: z.boolean({
    required_error: "U moet akkoord gaan met de privacyverklaring",
  }).refine(val => val === true, {
    message: "U moet akkoord gaan met de privacyverklaring",
  }),
  notes: z.string().optional(),
}).omit({ id: true, memberNumber: true, registrationDate: true });

type FormData = z.infer<typeof memberFormSchema>;

export default function MemberAdd() {
  // Controleer of we een lid aan het bewerken zijn aan de hand van query parameters
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id') ? parseInt(params.get('id')!) : undefined;
  const isEditMode = Boolean(memberId);
  
  // State voor delete en success dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState<Member | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Form setup met react-hook-form en zod validatie
  const form = useForm<FormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      // Persoonsgegevens
      firstName: "",
      lastName: "",
      gender: "man",
      birthDate: undefined,
      nationality: "",
      
      // Contactgegevens
      email: "",
      phoneNumber: "",
      street: "",
      houseNumber: "",
      busNumber: "",
      postalCode: "",
      city: "",
      
      // Lidmaatschap
      membershipType: "standaard",
      startDate: new Date(),
      endDate: undefined,
      autoRenew: true,
      paymentTerm: "jaarlijks",
      paymentMethod: "cash",
      
      // Financiën
      accountNumber: "",
      bicSwift: "",
      accountHolderName: "",
      
      // Overig
      privacyConsent: false,
      paymentStatus: false,
      notes: ""
    }
  });
  
  // Ophalen van lidgegevens bij bewerken
  const { data: memberData, isLoading: isLoadingMember, error: memberError } = useQuery<Member>({
    queryKey: [`/api/members/detail`, memberId],
    queryFn: async () => {
      if (!memberId) return undefined;
      
      try {
        // We gebruiken query parameters om compatibel te zijn met de Vercel serverless functies
        const response = await apiRequest('GET', `/api/members?id=${memberId}`);
        
        // Controleer of response OK is
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        // Verwerk response
        return await response.json();
      } catch (error) {
        throw error;
      }
    },
    enabled: isEditMode && memberId !== undefined,
    retry: 3, // Probeer de aanroep maximaal 3 keer bij falen
  });
  
  // Update formulier met bestaande gegevens bij bewerken
  useEffect(() => {
    if (memberData) {
      // Converteer datum strings naar Date objecten
      const birthDate = memberData.birthDate ? new Date(memberData.birthDate) : undefined;
      const endDate = memberData.endDate ? new Date(memberData.endDate) : undefined;
      
      form.reset({
        // Persoonsgegevens
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        gender: memberData.gender || "man",
        birthDate: birthDate,
        nationality: memberData.nationality || "",
        
        // Contactgegevens
        email: memberData.email || "",
        phoneNumber: memberData.phoneNumber,
        street: memberData.street || "",
        houseNumber: memberData.houseNumber || "",
        busNumber: memberData.busNumber || "",
        postalCode: memberData.postalCode || "",
        city: memberData.city || "",
        
        // Lidmaatschap
        membershipType: memberData.membershipType || "standaard",
        endDate: endDate,
        autoRenew: memberData.autoRenew !== undefined ? memberData.autoRenew : true,
        paymentTerm: memberData.paymentTerm || "jaarlijks",
        paymentMethod: memberData.paymentMethod || "cash",
        
        // Bankgegevens
        accountNumber: memberData.accountNumber || "",
        bicSwift: memberData.bicSwift || "",
        accountHolderName: memberData.accountHolderName || "",
        
        // Overig
        privacyConsent: memberData.privacyConsent || false,
        paymentStatus: memberData.paymentStatus || false,
        notes: memberData.notes || ""
      });
    }
  }, [memberData, form]);
  
  // Mutation om een nieuw lid aan te maken
  const createMemberMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/members", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      
      // Stel het nieuwe lid in voor de succes popup
      setNewMember(data);
      
      // Toon een succes popup met lidnummer en naam
      setSuccessDialogOpen(true);
      
      // Toon ook een toast notification
      toast({
        title: "Lid toegevoegd",
        description: "Het lid is succesvol toegevoegd aan de ledenadministratie.",
      });
      
      // Navigeer niet direct naar de ledenlijst, laat gebruiker eerst de popup zien
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
      
      // Gebruik query parameters in plaats van padparameters voor Vercel compatibiliteit
      const response = await apiRequest('PUT', `/api/members?id=${memberId}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Update de cache en navigeer naar de ledenlijst
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      queryClient.invalidateQueries({ queryKey: [`/api/members/detail`, memberId] });
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
  
  // Mutation om een lid te verwijderen
  const deleteMemberMutation = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error('Geen lid-ID gevonden om te verwijderen');
      // Gebruik query parameters in plaats van padparameters voor Vercel compatibiliteit
      await apiRequest('DELETE', `/api/members?id=${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      toast({
        title: 'Lid verwijderd',
        description: "Het lid is succesvol verwijderd uit de ledenadministratie.",
      });
      navigate('/members');
    },
    onError: (error) => {
      toast({
        title: 'Fout bij verwijderen',
        description: `Er is een fout opgetreden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Functie om lid te verwijderen
  const handleDeleteMember = () => {
    if (memberId) {
      deleteMemberMutation.mutate();
    }
  };
  
  const isPending = createMemberMutation.isPending || updateMemberMutation.isPending || deleteMemberMutation.isPending;
  
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
      
      {/* Toon eventuele fouten */}
      {isEditMode && memberError && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
          <h3 className="text-red-800 font-medium mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" /> 
            Fout bij ophalen lidgegevens
          </h3>
          <p className="text-red-700 text-sm">{memberError.message}</p>
          <div className="mt-2 bg-red-100 rounded p-2 overflow-auto">
            <pre className="text-xs text-red-800 whitespace-pre-wrap">
              {memberError.stack}
            </pre>
          </div>
        </div>
      )}
      

      
      <div>
        {/* Formulier */}
        <Card className="border-none shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
          <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl flex items-center">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#963E56]" />
              {isEditMode ? "Lid gegevens" : "Gegevens nieuw lid"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {isEditMode 
                ? "Wijzig de gegevens van het lid. Velden met een " 
                : "Vul alle vereiste informatie in om een nieuw lid toe te voegen. Velden met een "}
              <span className="text-destructive">*</span> zijn verplicht.
            </CardDescription>
            

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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geslacht<span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-[#963E56]">
                                <SelectValue placeholder="Selecteer geslacht" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="man">Man</SelectItem>
                              <SelectItem value="vrouw">Vrouw</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationaliteit</FormLabel>
                          <FormControl>
                            <Input placeholder="Nationaliteit" className="border-gray-200 focus:border-[#963E56]" {...field} />
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
                      // Gebruik een gewoon invoerveld voor geboortedatum in DD/MM/YYYY formaat
                      const [dateInput, setDateInput] = useState(
                        field.value ? format(field.value, "dd/MM/yyyy") : ""
                      );
                      
                      // Functie om een datum string in DD/MM/YYYY formaat te valideren en parsen
                      const validateAndParseDate = (dateStr: string) => {
                        // Controleer of het formaat DD/MM/YYYY is
                        const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
                        const match = dateStr.match(regex);
                        
                        if (!match) return null;
                        
                        const day = parseInt(match[1], 10);
                        const month = parseInt(match[2], 10) - 1; // JavaScript maanden zijn 0-gebaseerd
                        const year = parseInt(match[3], 10);
                        
                        // Controleer of dag, maand en jaar geldig zijn
                        if (
                          day < 1 || day > 31 || 
                          month < 0 || month > 11 || 
                          year < 1900 || year > new Date().getFullYear()
                        ) {
                          return null;
                        }
                        
                        // Maak een Date object en controleer of het geldig is
                        // Gebruik UTC om tijdzone-issues te voorkomen (dag -1 probleem)
                        const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
                        
                        // Controleer of datum niet in de toekomst ligt
                        if (date > new Date()) {
                          return null;
                        }
                        
                        // Controleer of de datum bestaat (bijv. 31/02/2023 bestaat niet)
                        const utcDay = date.getUTCDate();
                        const utcMonth = date.getUTCMonth();
                        const utcYear = date.getUTCFullYear();
                        
                        if (utcDay !== day || utcMonth !== month || utcYear !== year) {
                          return null;
                        }
                        
                        return date;
                      };
                      
                      // Verwerk input wijziging
                      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        setDateInput(value);
                        
                        // Format user input automatically as they type
                        if (value.length === 2 && !value.includes('/') && !dateInput.includes('/')) {
                          setDateInput(value + '/');
                        } else if (value.length === 5 && value.charAt(2) === '/' && !value.includes('/', 3)) {
                          setDateInput(value + '/');
                        }
                      };
                      
                      // Verwerk blur event (als gebruiker het veld verlaat)
                      const handleBlur = () => {
                        if (dateInput) {
                          const parsedDate = validateAndParseDate(dateInput);
                          if (parsedDate) {
                            field.onChange(parsedDate);
                          } else {
                            // Als datum ongeldig is, reset naar vorige geldige waarde
                            setDateInput(field.value ? format(field.value, "dd/MM/yyyy") : "");
                          }
                        } else {
                          field.onChange(undefined);
                        }
                      };
                      
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Geboortedatum<span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              placeholder="DD/MM/JJJJ"
                              value={dateInput}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              className="border-gray-200 focus:border-[#963E56]"
                            />
                          </FormControl>
                          <FormDescription className="text-xs sm:text-sm">
                            Vul de geboortedatum in (formaat: DD/MM/JJJJ).
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
                      render={({ field }) => {
                        // Formatteren bij weergave, maar originele waarde behouden bij invoer
                        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          // Alleen cijfers opslaan in de waarde
                          const cleaned = e.target.value.replace(/\D/g, '');
                          field.onChange(cleaned);
                        };
                        
                        return (
                          <FormItem>
                            <FormLabel>Telefoonnummer<span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Bijv. 0493-40-14-11" 
                                className="border-gray-200 focus:border-[#963E56]" 
                                value={field.value ? formatPhoneNumber(field.value) : ""}
                                onChange={handleInputChange}
                                onBlur={field.onBlur}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
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
                    
                    <div className="pt-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Adres (optioneel)</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name="street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Straat</FormLabel>
                              <FormControl>
                                <Input placeholder="Straatnaam" className="border-gray-200 focus:border-[#963E56]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name="houseNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Huisnr.</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nr." className="border-gray-200 focus:border-[#963E56]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="busNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bus</FormLabel>
                                <FormControl>
                                  <Input placeholder="Bus" className="border-gray-200 focus:border-[#963E56]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postcode</FormLabel>
                              <FormControl>
                                <Input placeholder="Postcode" className="border-gray-200 focus:border-[#963E56]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gemeente</FormLabel>
                              <FormControl>
                                <Input placeholder="Gemeente" className="border-gray-200 focus:border-[#963E56]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Lidmaatschap sectie */}
                <div>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="mr-2 bg-amber-50 p-1.5 sm:p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-700">Lidmaatschap</h3>
                  </div>
                  
                  {isEditMode && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <InfoIcon className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-800">Lidnummer: {memberData?.memberNumber}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Toon het volgende beschikbare lidnummer tijdens registratie */}
                  {!isEditMode && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <InfoIcon className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-800">
                          Volgend beschikbaar lidnummer: <span className="text-lg font-bold">0005</span>
                        </span>
                      </div>
                    </div>
                  )}
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="membershipType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lidmaatschapstype<span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-[#963E56]">
                                <SelectValue placeholder="Selecteer type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standaard">Standaard</SelectItem>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="senior">Senior</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => {
                        // Gebruik een gewoon invoerveld voor startdatum in DD/MM/YYYY formaat
                        const [dateInput, setDateInput] = useState(
                          field.value ? format(field.value, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")
                        );
                        
                        // Functie om een datum string in DD/MM/YYYY formaat te valideren en parsen
                        const validateAndParseDate = (dateStr: string) => {
                          if (!dateStr) return null;
                          
                          // Controleer of het formaat DD/MM/YYYY is
                          const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
                          const match = dateStr.match(regex);
                          
                          if (!match) return null;
                          
                          const day = parseInt(match[1], 10);
                          const month = parseInt(match[2], 10) - 1; // JavaScript maanden zijn 0-gebaseerd
                          const year = parseInt(match[3], 10);
                          
                          // Controleer of dag, maand en jaar geldig zijn
                          if (
                            day < 1 || day > 31 || 
                            month < 0 || month > 11 || 
                            year < 1900 || year > 2100
                          ) {
                            return null;
                          }
                          
                          // Maak een Date object en controleer of het geldig is
                          const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
                          
                          // Controleer of de datum bestaat (bijv. 31/02/2023 bestaat niet)
                          const utcDay = date.getUTCDate();
                          const utcMonth = date.getUTCMonth();
                          const utcYear = date.getUTCFullYear();
                          
                          if (utcDay !== day || utcMonth !== month || utcYear !== year) {
                            return null;
                          }
                          
                          return date;
                        };
                        
                        // Verwerk input wijziging
                        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value;
                          setDateInput(value);
                          
                          // Format user input automatically as they type
                          if (value.length === 2 && !value.includes('/') && !dateInput.includes('/')) {
                            setDateInput(value + '/');
                          } else if (value.length === 5 && value.charAt(2) === '/' && !value.includes('/', 3)) {
                            setDateInput(value + '/');
                          }
                        };
                        
                        // Verwerk blur event (als gebruiker het veld verlaat)
                        const handleBlur = () => {
                          if (dateInput) {
                            const parsedDate = validateAndParseDate(dateInput);
                            field.onChange(parsedDate);
                          } else {
                            field.onChange(new Date());
                          }
                        };
                        
                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Startdatum lidmaatschap<span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input
                                placeholder="DD/MM/JJJJ"
                                value={dateInput}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className="border-gray-200 focus:border-[#963E56]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="paymentTerm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Betalingstermijn<span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-[#963E56]">
                                <SelectValue placeholder="Selecteer termijn" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="maandelijks">Maandelijks</SelectItem>
                              <SelectItem value="driemaandelijks">Driemaandelijks</SelectItem>
                              <SelectItem value="jaarlijks">Jaarlijks</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => {
                        // Gebruik een gewoon invoerveld voor einddatum in DD/MM/YYYY formaat
                        const [dateInput, setDateInput] = useState(
                          field.value ? format(field.value, "dd/MM/yyyy") : ""
                        );
                        
                        // Functie om een datum string in DD/MM/YYYY formaat te valideren en parsen
                        const validateAndParseDate = (dateStr: string) => {
                          if (!dateStr) return null;
                          
                          // Controleer of het formaat DD/MM/YYYY is
                          const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
                          const match = dateStr.match(regex);
                          
                          if (!match) return null;
                          
                          const day = parseInt(match[1], 10);
                          const month = parseInt(match[2], 10) - 1; // JavaScript maanden zijn 0-gebaseerd
                          const year = parseInt(match[3], 10);
                          
                          // Controleer of dag, maand en jaar geldig zijn
                          if (
                            day < 1 || day > 31 || 
                            month < 0 || month > 11 || 
                            year < new Date().getFullYear() || year > 2100
                          ) {
                            return null;
                          }
                          
                          // Maak een Date object en controleer of het geldig is
                          const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
                          
                          // Controleer of de datum bestaat (bijv. 31/02/2023 bestaat niet)
                          const utcDay = date.getUTCDate();
                          const utcMonth = date.getUTCMonth();
                          const utcYear = date.getUTCFullYear();
                          
                          if (utcDay !== day || utcMonth !== month || utcYear !== year) {
                            return null;
                          }
                          
                          return date;
                        };
                        
                        // Verwerk input wijziging
                        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value;
                          setDateInput(value);
                          
                          // Format user input automatically as they type
                          if (value.length === 2 && !value.includes('/') && !dateInput.includes('/')) {
                            setDateInput(value + '/');
                          } else if (value.length === 5 && value.charAt(2) === '/' && !value.includes('/', 3)) {
                            setDateInput(value + '/');
                          }
                        };
                        
                        // Verwerk blur event (als gebruiker het veld verlaat)
                        const handleBlur = () => {
                          if (dateInput) {
                            const parsedDate = validateAndParseDate(dateInput);
                            field.onChange(parsedDate);
                          } else {
                            field.onChange(null);
                          }
                        };
                        
                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Einddatum lidmaatschap</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="DD/MM/JJJJ"
                                value={dateInput}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className="border-gray-200 focus:border-[#963E56]"
                              />
                            </FormControl>
                            <FormDescription className="text-xs sm:text-sm">
                              Alleen invullen bij tijdelijk lidmaatschap.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Betalingswijze<span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-[#963E56]">
                                <SelectValue placeholder="Selecteer betalingswijze" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="domiciliering">Domiciliëring</SelectItem>
                              <SelectItem value="overschrijving">Overschrijving</SelectItem>
                              <SelectItem value="bancontact">Bancontact</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="autoRenew"
                    render={({ field }) => (
                      <FormItem className="bg-gray-50 p-4 rounded-md flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Automatisch verlengen</FormLabel>
                          <FormDescription>
                            Het lidmaatschap wordt automatisch verlengd na afloop van de termijn.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
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
                    <h3 className="text-base sm:text-lg font-medium text-gray-700">Financiën</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Toon bankgegevens alleen als betalingsmethode domiciliëring of overschrijving is */}
                    {(form.watch("paymentMethod") === "domiciliering" || 
                      form.watch("paymentMethod") === "overschrijving") && (
                      <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-md space-y-4">
                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => {
                            // Zorg ervoor dat de waarde nooit null is
                            const value = field.value === null ? "" : field.value;
                            return (
                              <FormItem>
                                <FormLabel>IBAN<span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="IBAN (bijv. BE68539007547034)" 
                                    className="border-gray-200 focus:border-[#963E56]" 
                                    value={value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormDescription>
                                  IBAN-formaat: BE68 5390 0754 7034 (spaties worden automatisch verwijderd)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        
                        <FormField
                          control={form.control}
                          name="accountHolderName"
                          render={({ field }) => {
                            // Zorg ervoor dat de waarde nooit null is
                            const value = field.value === null ? "" : field.value;
                            return (
                              <FormItem>
                                <FormLabel>Naam rekeninghouder<span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Naam rekeninghouder" 
                                    className="border-gray-200 focus:border-[#963E56]" 
                                    value={value}
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bicSwift"
                          render={({ field }) => {
                            // Zorg ervoor dat de waarde nooit null is
                            const value = field.value === null ? "" : field.value;
                            return (
                              <FormItem>
                                <FormLabel>BIC/SWIFT-code</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="BIC/SWIFT (alleen voor buitenlandse rekeningen)" 
                                    className="border-gray-200 focus:border-[#963E56]" 
                                    value={value}
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Alleen verplicht voor buitenlandse rekeningen.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    )}
                    
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
                
                {/* Privacyverklaring akkoord */}
                <div>
                  <FormField
                    control={form.control}
                    name="privacyConsent"
                    render={({ field }) => (
                      <FormItem className="p-4 border border-amber-200 bg-amber-50 rounded-md flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-[#963E56] data-[state=checked]:border-[#963E56]"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Akkoord met privacyverklaring<span className="text-destructive">*</span></FormLabel>
                          <FormDescription>
                            Ik ga akkoord met de privacyverklaring van MEFEN Moskee en geef toestemming voor het verwerken 
                            van mijn persoonsgegevens in overeenstemming met de AVG/GDPR wetgeving.
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-4 sm:pt-2">
                  {/* Links: Verwijder-knop (alleen in bewerkingsmodus) */}
                  <div className="order-3 sm:order-1">
                    {isEditMode && (
                      <Button 
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Lid verwijderen
                      </Button>
                    )}
                  </div>
                  
                  {/* Rechts: Annuleren en Opslaan knoppen */}
                  <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2 sm:justify-end">
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Alert Dialog voor verwijderbevestiging */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Lid verwijderen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit lid wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
              {memberData && (
                <div className="mt-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">{memberData.firstName} {memberData.lastName}</p>
                  <p className="text-xs text-gray-500">Lidnummer: {memberData.memberNumber.toString().padStart(4, '0')}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200">Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig met verwijderen...
                </>
              ) : (
                "Definitief verwijderen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Success Dialog na succesvol toevoegen van een lid */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Lid succesvol toegevoegd
            </AlertDialogTitle>
            <AlertDialogDescription>
              Het nieuwe lid is succesvol toegevoegd aan de ledenadministratie.
              
              {newMember && (
                <div className="mt-4 p-4 border border-green-200 rounded-md bg-green-50">
                  <div className="mb-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <UserCircle className="h-8 w-8 text-[#963E56] mr-3" />
                      <div>
                        <h3 className="font-bold text-gray-800">{newMember.firstName} {newMember.lastName}</h3>
                        <p className="text-sm text-gray-600">
                          {newMember.gender === 'man' ? 'Dhr.' : 'Mevr.'}, {newMember.nationality}
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#963E56] text-white px-3 py-1 rounded-full text-sm font-medium">
                      Lidnummer: {newMember.memberNumber.toString().padStart(4, '0')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Contact:</p>
                      <p className="font-medium">{newMember.phoneNumber}</p>
                      {newMember.email && <p className="font-medium">{newMember.email}</p>}
                    </div>
                    <div>
                      <p className="text-gray-500">Lidmaatschap:</p>
                      <p className="font-medium capitalize">{newMember.membershipType}</p>
                      <p className="font-medium capitalize">{newMember.paymentTerm}</p>
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              className="hidden sm:flex border-gray-200"
              onClick={() => {
                setSuccessDialogOpen(false);
                form.reset(); // Reset het formulier voor een nieuw lid
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nog een lid toevoegen
            </Button>
            <AlertDialogAction
              onClick={() => navigate('/members')}
              className="bg-[#963E56] hover:bg-[#963E56]/90 w-full sm:w-auto"
            >
              Ga naar ledenlijst
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}