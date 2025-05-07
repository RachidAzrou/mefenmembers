import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { CalendarIcon, CheckIcon, Loader2, User, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Schema definitie voor het formulier
const registrationSchema = z.object({
  // Persoonsgegevens
  firstName: z.string().min(2, "Voornaam is te kort").max(50, "Voornaam is te lang"),
  lastName: z.string().min(2, "Achternaam is te kort").max(50, "Achternaam is te lang"),
  gender: z.enum(["man", "vrouw"], {
    required_error: "Geslacht is verplicht",
  }),
  birthDate: z.date({
    required_error: "Geboortedatum is verplicht",
    invalid_type_error: "Geboortedatum moet een geldige datum zijn",
  }),
  nationality: z.string().optional(),
  
  // Contactgegevens
  email: z.string().email("Ongeldig e-mailadres"),
  phoneNumber: z.string()
    .min(8, "Telefoonnummer moet minstens 8 tekens bevatten")
    .regex(/^[0-9+\-\s()]+$/, "Telefoonnummer mag alleen cijfers, +, - of spaties bevatten"),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  busNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  
  // Lidmaatschap
  membershipType: z.enum(["standaard", "student", "senior"]).default("standaard"),
  paymentTerm: z.enum(["maandelijks", "driemaandelijks", "jaarlijks"]).default("jaarlijks"),
  paymentMethod: z.enum(["cash", "domiciliering", "overschrijving", "bancontact"]).default("cash"),
  autoRenew: z.boolean().default(true),
  
  // Bankgegevens
  accountNumber: z.string().optional()
    .refine(val => !val || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(val), {
      message: "Ongeldig IBAN formaat. Bijvoorbeeld: BE68539007547034"
    }),
  accountHolderName: z.string().optional(),
  bicSwift: z.string().optional(),
  
  // Privacy en voorwaarden
  privacyConsent: z.boolean().refine(val => val === true, {
    message: "Je moet akkoord gaan met de privacyvoorwaarden"
  }),
  
  // Eventuele opmerkingen
  notes: z.string().optional(),
}).refine((data) => {
  // Validatie: Bij domiciliëring is een rekeningnummer verplicht
  if (data.paymentMethod === 'domiciliering') {
    return !!data.accountNumber;
  }
  return true;
}, {
  message: "Rekeningnummer is verplicht bij domiciliëring",
  path: ["accountNumber"],
});

type FormData = z.infer<typeof registrationSchema>;

export default function RegisterRequest() {
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      membershipType: "standaard",
      paymentTerm: "jaarlijks",
      paymentMethod: "cash",
      autoRenew: true,
      privacyConsent: false,
      notes: "",
      accountHolderName: "",
      bicSwift: "",
    },
  });
  
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/member-requests", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aanvraag ingediend",
        description: "Je lidmaatschapsaanvraag is succesvol ingediend.",
      });
      form.reset();
      setSuccess(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Er is een fout opgetreden",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: FormData) {
    mutation.mutate(data);
  }
  
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-3 sm:p-6 md:p-12"
           style={{
             background: "url('/pattern.jpg') center/cover fixed no-repeat, linear-gradient(135deg, rgba(245, 247, 250, 0.7), rgba(195, 207, 226, 0.7))",
             backgroundBlendMode: "overlay"
           }}>
        <div className="w-full max-w-3xl mx-auto bg-white/95 rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
          {/* Header in bordeauxrode stijl, net als form */}
          <div className="bg-[#963E56] p-5 sm:p-6 md:p-8 text-white rounded-t-xl">
            <h1 className="text-xl sm:text-2xl font-bold text-center">
              MEFEN Moskee Lidmaatschapsaanvraag
            </h1>
          </div>
          
          <div className="p-6 sm:p-8 md:p-10 flex flex-col items-center text-center space-y-4 sm:space-y-6">
            <div className="rounded-full bg-[#963E56]/10 p-3 sm:p-4 w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center">
              <CheckIcon className="h-8 w-8 sm:h-10 sm:w-10 text-[#963E56]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Aanvraag Succesvol Ingediend!</h2>
            <p className="text-gray-600 max-w-md text-sm sm:text-base md:text-lg">
              Bedankt voor je aanvraag. We zullen deze zo snel mogelijk beoordelen en nemen contact 
              met je op via de door jou opgegeven contactgegevens.
            </p>
            <div className="mt-4 sm:mt-6 w-full sm:w-auto">
              <Button 
                onClick={() => setSuccess(false)}
                className="w-full sm:w-auto bg-[#963E56] hover:bg-[#7d3447] text-white font-medium px-6 py-3 rounded-md transition-colors shadow-sm"
              >
                Nieuwe aanvraag indienen
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen py-4 px-2 sm:py-6 sm:px-4 md:py-12 md:px-6 lg:px-8" 
         style={{
           background: "url('/pattern.jpg') center/cover fixed no-repeat, linear-gradient(135deg, rgba(245, 247, 250, 0.7), rgba(195, 207, 226, 0.7))",
           backgroundBlendMode: "overlay"
         }}>
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white/95 shadow-xl rounded-xl overflow-hidden backdrop-blur-md">
          {/* Header in bordeauxrode stijl zoals dashboard */}
          <div className="bg-[#963E56] p-4 sm:p-5 md:p-6 text-white rounded-t-xl">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center">
              MEFEN Moskee Lidmaatschapsaanvraag
            </h1>
            <p className="mt-1 sm:mt-2 opacity-90 text-xs sm:text-sm md:text-base text-center">
              Vul onderstaand formulier in om lid te worden
            </p>
          </div>
          
          {/* Formulier */}
          <div className="p-3 sm:p-4 md:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6 md:space-y-8">
                
                {/* Sectie: Persoonsgegevens */}
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-sm sm:text-base">1</div>
                    <h2 className="text-lg sm:text-xl font-semibold">Persoonsgegevens</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rij 1: Voornaam en Achternaam */}
                    <div>
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">Voornaam <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Voornaam" 
                                {...field} 
                                className="h-10 text-sm"
                                autoComplete="given-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">Naam <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Naam" 
                                {...field} 
                                className="h-10 text-sm"
                                autoComplete="family-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Rij 2: Geslacht en Geboortedatum */}
                    <div>
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-sm sm:text-base">Geslacht <span className="text-red-500">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10 text-sm">
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
                    </div>
                    
                    <div>
                      <FormField
                        control={form.control}
                        name="birthDate"
                        render={({ field }) => {
                          const [birthDateInput, setBirthDateInput] = useState(
                            field.value ? format(field.value, "dd/MM/yyyy") : ""
                          );
                          
                          // Update de birthDateInput wanneer field.value verandert
                          useEffect(() => {
                            if (field.value) {
                              setBirthDateInput(format(field.value, "dd/MM/yyyy"));
                            }
                          }, [field.value]);
                          
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
                            setBirthDateInput(value);
                            
                            // Format user input automatically as they type
                            if (value.length === 2 && !value.includes('/') && !birthDateInput.includes('/')) {
                              setBirthDateInput(value + '/');
                            } else if (value.length === 5 && value.charAt(2) === '/' && !value.includes('/', 3)) {
                              setBirthDateInput(value + '/');
                            }
                          };
                          
                          // Verwerk blur event (als gebruiker het veld verlaat)
                          const handleBlur = () => {
                            if (birthDateInput) {
                              const parsedDate = validateAndParseDate(birthDateInput);
                              if (parsedDate) {
                                field.onChange(parsedDate);
                              } else {
                                // Als datum ongeldig is, reset naar vorige geldige waarde
                                setBirthDateInput(field.value ? format(field.value, "dd/MM/yyyy") : "");
                              }
                            } else {
                              field.onChange(undefined);
                            }
                          };
                          
                          return (
                            <FormItem className="flex flex-col">
                              <FormLabel>Geboortedatum <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="DD/MM/JJJJ"
                                  value={birthDateInput}
                                  onChange={handleInputChange}
                                  onBlur={handleBlur}
                                  className="text-sm"
                                  inputMode="numeric"
                                  pattern="\d{1,2}/\d{1,2}/\d{4}"
                                />
                              </FormControl>
                              <FormDescription className="text-xs sm:text-sm">
                                Formaat: DD/MM/JJJJ (bijv. 15/06/1985)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                    
                    {/* Rij 3: Nationaliteit (alleen in eerste kolom) */}
                    <div>
                      <FormField
                        control={form.control}
                        name="nationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">Nationaliteit</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nationaliteit" 
                                {...field} 
                                className="h-10 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Sectie: Contactgegevens */}
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-sm sm:text-base">2</div>
                    <h2 className="text-lg sm:text-xl font-semibold">Contactgegevens</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="voorbeeld@email.com" 
                              {...field}
                              className="text-sm" 
                              inputMode="email"
                              autoComplete="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                            <FormLabel>Telefoonnummer <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Bijv. 0493401411" 
                                value={field.value ? formatPhoneNumber(field.value) : ""}
                                onChange={handleInputChange}
                                className="text-sm"
                                inputMode="tel"
                                type="tel"
                                autoComplete="tel"
                              />
                            </FormControl>
                            <FormDescription className="text-xs sm:text-sm">
                              Streepjes worden automatisch toegevoegd
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    
                    {/* Adres velden */}
                    
                    {/* Straat */}
                    <div className="col-span-2 md:col-span-1">
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">Straat</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Straatnaam" 
                                {...field} 
                                className="text-sm"
                                autoComplete="street-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Huisnummer en Bus op één rij */}
                    <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="houseNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">Huisnr.</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="123" 
                                {...field} 
                                className="text-sm"
                                inputMode="numeric"
                              />
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
                            <FormLabel className="text-sm sm:text-base">Bus</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="B1" 
                                {...field} 
                                className="text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Postcode en Plaats naast elkaar op mobiel */}
                    <div className="col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">Postcode</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="1234" 
                                {...field} 
                                className="text-sm"
                                inputMode="numeric"
                                autoComplete="postal-code"
                              />
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
                            <FormLabel className="text-sm sm:text-base">Plaats</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Gemeente" 
                                {...field}
                                className="text-sm"
                                autoComplete="address-level2"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Sectie: Lidmaatschap */}
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-sm sm:text-base">3</div>
                    <h2 className="text-lg sm:text-xl font-semibold">Lidmaatschap</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="membershipType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Type lidmaatschap</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm h-10">
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
                      name="paymentTerm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Betalingstermijn</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm h-10">
                                <SelectValue placeholder="Selecteer betalingstermijn" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="jaarlijks">Jaarlijks</SelectItem>
                              <SelectItem value="driemaandelijks">Driemaandelijks</SelectItem>
                              <SelectItem value="maandelijks">Maandelijks</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs sm:text-sm">
                            Hoe vaak wil je je lidmaatschap betalen?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Betalingswijze</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm h-10">
                                <SelectValue placeholder="Selecteer betalingswijze" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bancontact">Bancontact</SelectItem>
                              <SelectItem value="overschrijving">Overschrijving</SelectItem>
                              <SelectItem value="domiciliering">Domiciliëring</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Conditionele berichten op basis van betalingsmethode */}
                    {form.watch("paymentMethod") === "cash" && (
                      <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 shadow-sm">
                        <p className="text-yellow-800 text-xs sm:text-sm">
                          <strong>Let op:</strong> Bij betaling met cash dient u een medewerker van de moskee aan te spreken. 
                          Uw inschrijving wordt pas officieel na ontvangst van de betaling.
                        </p>
                      </div>
                    )}
                    
                    {form.watch("paymentMethod") === "bancontact" && (
                      <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 shadow-sm">
                        <p className="text-yellow-800 text-xs sm:text-sm">
                          <strong>Let op:</strong> Bij betaling met Bancontact dient u een medewerker van de moskee aan te spreken. 
                          Uw inschrijving wordt pas officieel na ontvangst van de betaling.
                        </p>
                      </div>
                    )}
                    
                    {/* Toon bankgegevens alleen als betalingsmethode domiciliëring of overschrijving is */}
                    {(form.watch("paymentMethod") === "domiciliering" || 
                      form.watch("paymentMethod") === "overschrijving") && (
                      <div className="col-span-2 p-3 sm:p-4 border border-blue-100 bg-blue-50/50 rounded-lg shadow-sm space-y-3 sm:space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 shadow-sm">
                          <p className="text-blue-800 text-xs sm:text-sm">
                            <strong>Belangrijk:</strong> Uw inschrijving wordt pas officieel na ontvangst van uw eerste betaling via {form.watch("paymentMethod") === "domiciliering" ? "domiciliëring" : "overschrijving"}.
                            De betaalgegevens worden naar uw e-mailadres gestuurd na goedkeuring van uw aanvraag.
                          </p>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IBAN<span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="IBAN (BE68539007547034)" 
                                  {...field}
                                  className="text-sm"
                                  inputMode="text"
                                />
                              </FormControl>
                              <FormDescription className="text-xs sm:text-sm">
                                IBAN-formaat: BE68 5390 0754 7034
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="accountHolderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Naam rekeninghouder<span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Naam rekeninghouder" 
                                  {...field}
                                  className="text-sm" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bicSwift"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>BIC/SWIFT-code</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="BIC/SWIFT" 
                                  {...field}
                                  className="text-sm" 
                                />
                              </FormControl>
                              <FormDescription className="text-xs sm:text-sm">
                                Alleen nodig voor buitenlandse rekeningen
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    <FormField
                      control={form.control}
                      name="autoRenew"
                      render={({ field }) => (
                        <FormItem className="col-span-2 flex flex-row items-center justify-between space-y-0 rounded-lg border border-[#963E56]/20 bg-[#963E56]/5 p-3 sm:p-4 shadow-sm">
                          <div className="space-y-0.5 pr-3">
                            <FormLabel className="text-sm sm:text-base text-[#963E56] font-medium">Automatisch verlengen</FormLabel>
                            <FormDescription className="text-xs sm:text-sm text-[#963E56]/80">
                              Lidmaatschap verlengt automatisch na afloop
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#963E56]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                

                
                {/* Privacy consent */}
                <FormField
                  control={form.control}
                  name="privacyConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 sm:p-4 border border-gray-200 rounded-lg shadow-sm">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1 h-5 w-5 rounded-md data-[state=checked]:bg-[#963E56] data-[state=checked]:text-white"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-tight">
                        <FormLabel className="text-sm sm:text-base">
                          Ik ga akkoord met de verwerking van mijn gegevens <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormDescription className="text-xs sm:text-sm">
                          Je gegevens worden vertrouwelijk behandeld en alleen gebruikt voor het beheren van je lidmaatschap.
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Submit knop */}
                <div className="flex justify-center sm:justify-end mt-4 sm:mt-2">
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto bg-[#963E56] hover:bg-[#7d3447] text-white shadow-sm p-6 sm:p-6 h-auto font-medium text-base"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Bezig met indienen...
                      </>
                    ) : "Verstuur aanvraag"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}