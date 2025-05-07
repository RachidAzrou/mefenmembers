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
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { CalendarIcon, CheckIcon, Loader2 } from "lucide-react";
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
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gray-50">
        <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckIcon className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Aanvraag Succesvol Ingediend!</h1>
            <p className="text-gray-600 max-w-md">
              Bedankt voor je aanvraag. We zullen deze zo snel mogelijk beoordelen en nemen contact 
              met je op via de door jou opgegeven contactgegevens.
            </p>
            <div className="mt-6">
              <Button 
                onClick={() => setSuccess(false)}
                variant="outline"
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header met logo */}
          <div className="bg-primary px-6 py-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">MEFEN Moskee Lidmaatschapsaanvraag</h1>
                <p className="mt-1 opacity-90">
                  Vul dit formulier in om je aan te melden als lid van de MEFEN Moskee
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <img 
                  src="/attached_assets/6eacafa2-cbb2-41f3-be40-6548da0680c6.png" 
                  alt="MEFEN Moskee Logo" 
                  className="h-16 w-auto"
                />
              </div>
            </div>
          </div>
          
          {/* Formulier */}
          <div className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Sectie: Persoonsgegevens */}
                <div className="border border-gray-200 rounded-md p-4 md:p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">1</div>
                    <h2 className="text-xl font-semibold">Persoonsgegevens</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rij 1: Voornaam en Achternaam */}
                    <div>
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Voornaam <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Voornaam" {...field} />
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
                            <FormLabel>Achternaam <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Achternaam" {...field} />
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
                          <FormItem className="h-full">
                            <FormLabel>Geslacht <span className="text-red-500">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
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
                    
                    {/* Rij 3: Nationaliteit (alleen in eerste kolom) */}
                    <div>
                      <FormField
                        control={form.control}
                        name="nationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationaliteit</FormLabel>
                            <FormControl>
                              <Input placeholder="Nationaliteit" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Sectie: Contactgegevens */}
                <div className="border border-gray-200 rounded-md p-4 md:p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">2</div>
                    <h2 className="text-xl font-semibold">Contactgegevens</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="voorbeeld@email.com" {...field} />
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
                                placeholder="Bijv. 0493-40-14-11" 
                                value={field.value ? formatPhoneNumber(field.value) : ""}
                                onChange={handleInputChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    
                    <div className="col-span-2 mb-2">
                      <Label className="text-base font-medium">Adres</Label>
                    </div>
                    
                    {/* Straat */}
                    <div className="col-span-2 md:col-span-1">
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Straat</FormLabel>
                            <FormControl>
                              <Input placeholder="Straatnaam" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Huisnummer en Bus op één rij */}
                    <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="houseNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Huisnr.</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
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
                              <Input placeholder="B1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Postcode */}
                    <div>
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postcode</FormLabel>
                            <FormControl>
                              <Input placeholder="1234" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Plaats */}
                    <div>
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plaats</FormLabel>
                            <FormControl>
                              <Input placeholder="Gemeente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Sectie: Lidmaatschap */}
                <div className="border border-gray-200 rounded-md p-4 md:p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">3</div>
                    <h2 className="text-xl font-semibold">Lidmaatschap</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="membershipType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type lidmaatschap</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
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
                          <FormLabel>Betalingstermijn</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer betalingstermijn" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="jaarlijks">Jaarlijks</SelectItem>
                              <SelectItem value="driemaandelijks">Driemaandelijks</SelectItem>
                              <SelectItem value="maandelijks">Maandelijks</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
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
                          <FormLabel>Betalingswijze</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
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
                      <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-yellow-800 text-sm">
                          <strong>Let op:</strong> Bij betaling met cash dient u een medewerker van de moskee aan te spreken. 
                          Uw inschrijving wordt pas officieel na ontvangst van de betaling.
                        </p>
                      </div>
                    )}
                    
                    {form.watch("paymentMethod") === "bancontact" && (
                      <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-yellow-800 text-sm">
                          <strong>Let op:</strong> Bij betaling met Bancontact dient u een medewerker van de moskee aan te spreken. 
                          Uw inschrijving wordt pas officieel na ontvangst van de betaling.
                        </p>
                      </div>
                    )}
                    
                    {form.watch("paymentMethod") === "overschrijving" && (
                      <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-md p-4">
                        <p className="text-blue-800 text-sm">
                          <strong>Belangrijk:</strong> Uw inschrijving wordt pas officieel na ontvangst van uw eerste betaling via overschrijving.
                          De betaalgegevens worden naar uw e-mailadres gestuurd na goedkeuring van uw aanvraag.
                        </p>
                      </div>
                    )}
                    
                    {form.watch("paymentMethod") === "domiciliering" && (
                      <div className="col-span-2 space-y-6">
                        <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-md p-4">
                          <p className="text-blue-800 text-sm">
                            <strong>Belangrijk:</strong> Uw inschrijving wordt pas officieel na ontvangst van uw eerste betaling via domiciliëring.
                            De betaalgegevens worden naar uw e-mailadres gestuurd na goedkeuring van uw aanvraag.
                          </p>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IBAN Rekeningnummer <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="BE00 0000 0000 0000" {...field} />
                              </FormControl>
                              <FormDescription>
                                Vereist voor domiciliëring
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    {form.watch("paymentMethod") !== "domiciliering" && (
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN Rekeningnummer</FormLabel>
                            <FormControl>
                              <Input placeholder="BE00 0000 0000 0000" {...field} />
                            </FormControl>
                            <FormDescription>
                              Optioneel, voor eventuele terugbetalingen
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="autoRenew"
                      render={({ field }) => (
                        <FormItem className="col-span-2 bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex flex-row items-start space-x-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1 border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
                              />
                            </FormControl>
                            <div>
                              <FormLabel className="text-base font-medium text-green-800">
                                Automatisch verlengen
                              </FormLabel>
                              <FormDescription className="text-green-700">
                                Door deze optie aan te vinken, wordt uw lidmaatschap automatisch verlengd 
                                bij het verstrijken van de betalingstermijn. U hoeft zich dan geen zorgen te maken 
                                over verlopen van uw lidmaatschap.
                              </FormDescription>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Sectie: Opmerkingen */}
                <div className="border border-gray-200 rounded-md p-4 md:p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">4</div>
                    <h2 className="text-xl font-semibold">Aanvullende informatie</h2>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opmerkingen of aanvullende informatie</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Voeg eventuele opmerkingen of extra informatie toe..." 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Privacy consent */}
                <FormField
                  control={form.control}
                  name="privacyConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-200 rounded-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Ik ga akkoord met de verwerking van mijn gegevens <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormDescription>
                          Je gegevens worden vertrouwelijk behandeld en alleen gebruikt voor het beheren van je lidmaatschap.
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Submit knop */}
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig met indienen...
                    </>
                  ) : "Verstuur aanvraag"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}