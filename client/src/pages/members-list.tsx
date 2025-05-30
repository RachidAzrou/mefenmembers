import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member as BaseMember, insertMemberSchema } from "@shared/schema";

// Uitbreiding van Member met UI-specifieke velden
interface Member extends BaseMember {
  showDelete?: boolean;
}
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Eye, MoreHorizontal, Plus, Search, SlidersHorizontal, Save, Loader2,
  CalendarDays, Users, User, Phone, StickyNote, Edit, Info,
  SortAsc, SortDesc, Trash2, ArrowUpDown, Filter, UserCheck, AlertTriangle, 
  GraduationCap, CreditCard, AlertCircle, ChevronUp, ChevronDown, Banknote, X, Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPhoneNumber } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { z } from "zod";
import { nl } from "date-fns/locale";

// Vote icon component
function Vote(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 7h10v2H3z" />
      <path d="M5 16h14v2H5z" />
      <path d="M17 12h4v2h-4z" />
      <path d="M11 7v14" />
      <path d="m9 14 2 2 2-2" />
    </svg>
  );
}

// Form schema voor bewerking in dialoog (inclusief geboortedatum)
const memberEditSchema = insertMemberSchema.extend({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
  email: z.string().email("Voer een geldig e-mailadres in").optional().or(z.literal('')),
  notes: z.string().optional(),
  accountNumber: z.string().optional().nullable(),
  paymentStatus: z.boolean().default(false),
  birthDate: z.string().min(1, "Geboortedatum is verplicht").or(z.literal('')),
  startDate: z.string().min(1, "Startdatum is verplicht").or(z.date()),
}).omit({ id: true, memberNumber: true, registrationDate: true });

type MemberEditData = z.infer<typeof memberEditSchema>;

export default function MembersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteIcons, setShowDeleteIcons] = useState(false); // Nieuwe state voor weergave prullenbakken
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<"all" | "paid" | "unpaid" | "recent">("all");
  const [sortField, setSortField] = useState<string>("memberNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [location, navigate] = useLocation();
  
  // Nieuwe filters met mogelijkheid voor meerdere selecties
  const [votingFilter, setVotingFilter] = useState<string[]>([]);
  const [membershipTypeFilter, setMembershipTypeFilter] = useState<string[]>([]);
  const [paymentTermFilter, setPaymentTermFilter] = useState<string[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Verwerk URL query parameters bij eerste laden
  useEffect(() => {
    // Parse huidige URL parameters
    const url = new URL(window.location.href);
    const params = url.searchParams;
    
    // Filter op basis van URL parameters
    // Voorbeelden: ?gender=man, ?type=student, ?voting=true
    if (params.has("gender")) {
      // Gender filter wordt apart bijgehouden in de component state
      const gender = params.get("gender");
      if (gender === "man" || gender === "vrouw") {
        // Gebruik een impliciete parameter
        // Wordt verwerkt in de filteredMembers functie
      }
    } else if (params.has("type")) {
      // Lidmaatschapstype filter
      const type = params.get("type");
      if (type === "standaard" || type === "student" || type === "senior") {
        // Gebruik een impliciete parameter
        // Wordt verwerkt in de filteredMembers functie
      }
    } else if (params.has("voting")) {
      // Filter voor stemgerechtigde leden
      const voting = params.get("voting");
      if (voting === "true") {
        // Gebruik een impliciete parameter
        // Wordt verwerkt in de filteredMembers functie
      }
    } else if (params.has("paid")) {
      // Betalingsstatus filter
      const paid = params.get("paid");
      if (paid === "true") {
        setActiveFilter("paid");
      } else if (paid === "false") {
        setActiveFilter("unpaid");
      }
    }
    
  }, []);
  
  // URL wijzigen op basis van geselecteerde filter
  useEffect(() => {
    // Update URL alleen als we expliciet van filter veranderen
    // Niet bij initieel laden
    if (activeFilter !== "all") {
      const newUrl = new URL(window.location.href);
      if (activeFilter === "paid") {
        newUrl.searchParams.set("paid", "true");
      } else if (activeFilter === "unpaid") {
        newUrl.searchParams.set("paid", "false");
      } else if (activeFilter === "recent") {
        newUrl.searchParams.set("recent", "true");
      }
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [activeFilter]);
  
  // Form setup voor bewerken in dialoog
  const form = useForm<MemberEditData>({
    resolver: zodResolver(memberEditSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      paymentStatus: false,
      notes: "",
      accountNumber: "",
      birthDate: "",
      startDate: ""
    }
  });
  
  // Haal alle leden op
  const { data: apiMembers = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Lokale state voor leden met extra UI-eigenschappen
  const [members, setMembers] = useState<(Member & { showDelete?: boolean })[]>([]);
  
  // Update lokale leden wanneer API data wijzigt
  useEffect(() => {
    setMembers(apiMembers.map(member => ({ ...member, showDelete: false })));
  }, [apiMembers]);
  
  // Bereken leeftijd functie
  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const bDate = new Date(birthDate);
    let age = today.getFullYear() - bDate.getFullYear();
    const monthDiff = today.getMonth() - bDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Functie om het aantal lidmaatschapsjaren te berekenen
  const calculateMembershipYears = (member: Member): number => {
    // Gebruik startDate als die beschikbaar is, anders registrationDate
    const membershipDate = member.startDate || member.registrationDate;
    if (!membershipDate) return 0;
    
    const today = new Date();
    const startDate = new Date(membershipDate);
    let years = today.getFullYear() - startDate.getFullYear();
    
    // Controleer of de 'verjaardag' van het lidmaatschap al is gepasseerd dit jaar
    if (
      today.getMonth() < startDate.getMonth() || 
      (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate())
    ) {
      years--;
    }
    
    return Math.max(0, years);
  };
  
  // Functie om te bepalen of een lid stemgerechtigd is
  const isVotingEligible = (member: Member): boolean => {
    // Voorwaarde 1: Meerderjarig (18+)
    const age = calculateAge(member.birthDate);
    if (!age || age < 18) return false;
    
    // Voorwaarde 2: Minstens 5 jaar aaneensluitend lid
    const membershipYears = calculateMembershipYears(member);
    if (membershipYears < 5) return false;
    
    // Voorwaarde 3: Elk jaar betaald
    // Omdat we nog geen betalingsgeschiedenis bijhouden, gebruiken we de huidige betalingsstatus als benadering
    if (!member.paymentStatus) return false;
    
    // Aan alle voorwaarden voldaan
    return true;
  };

  // Filter leden op basis van zoekopdracht, actieve filter en URL parameters
  const filteredMembers = members.filter(member => {
    // Eerst op zoekopdracht filteren
    const matchesSearch = searchQuery === "" || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.memberNumber?.toString().includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.phoneNumber.includes(searchQuery);
    
    // Vervolgens op actieve filter (betaalstatus)
    let matchesPaymentFilter = true;
    if (activeFilter === "paid") {
      matchesPaymentFilter = member.paymentStatus === true;
    } else if (activeFilter === "unpaid") {
      matchesPaymentFilter = member.paymentStatus === false;
    } else if (activeFilter === "recent") {
      // Beschouw "recent" als lid geworden in de afgelopen 30 dagen
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesPaymentFilter = new Date(member.registrationDate) >= thirtyDaysAgo;
    }
    
    // Filter op stemgerechtigdheid met ondersteuning voor meerdere selecties
    let matchesVotingFilter = true;
    if (votingFilter.length > 0) {
      // Als geen selecties, dan geen filter (alles tonen)
      // Als een of meer selecties, dan moet lid aan ten minste één voldoen
      matchesVotingFilter = votingFilter.includes("eligible") && isVotingEligible(member) ||
                           votingFilter.includes("not-eligible") && !isVotingEligible(member);
    }
    
    // Filter op lidmaatschapstype met ondersteuning voor meerdere selecties
    let matchesMembershipType = true;
    if (membershipTypeFilter.length > 0) {
      matchesMembershipType = membershipTypeFilter.includes(member.membershipType);
    }
    
    // Filter op betalingstermijn met ondersteuning voor meerdere selecties
    let matchesPaymentTerm = true;
    if (paymentTermFilter.length > 0) {
      matchesPaymentTerm = paymentTermFilter.includes(member.paymentTerm);
    }
    
    // Filter op betaalmethode met ondersteuning voor meerdere selecties
    let matchesPaymentMethod = true;
    if (paymentMethodFilter.length > 0) {
      matchesPaymentMethod = paymentMethodFilter.includes(member.paymentMethod);
    }
    
    // Filter op geslacht met ondersteuning voor meerdere selecties
    let matchesGender = true;
    if (genderFilter.length > 0) {
      matchesGender = genderFilter.includes(member.gender);
    }
    
    // URL Parameters verwerken indien aanwezig
    const url = new URL(window.location.href);
    const params = url.searchParams;
    
    // Gender filter van URL (als deze bestaat)
    if (params.has("gender")) {
      const genderParam = params.get("gender");
      if ((genderParam === "man" || genderParam === "vrouw") && member.gender !== genderParam) {
        return false;
      }
    }
    
    // Lidmaatschapstype filter van URL (als deze bestaat)
    if (params.has("type")) {
      const typeParam = params.get("type");
      if (typeParam && member.membershipType !== typeParam) {
        return false;
      }
    }
    
    // Stemgerechtigden filter van URL (als deze bestaat)
    if (params.has("voting") && params.get("voting") === "true") {
      if (!isVotingEligible(member)) return false;
    }
    
    // Combineer alle filtercriteria
    return matchesSearch && 
           matchesPaymentFilter && 
           matchesVotingFilter && 
           matchesMembershipType && 
           matchesPaymentTerm && 
           matchesPaymentMethod && 
           matchesGender;
  });
  
  // Sorteer de gefilterde leden
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // Controleer de sorteerrichting
    const modifier = sortDirection === "asc" ? 1 : -1;
    
    // Sorteer op basis van het geselecteerde veld
    switch (sortField) {
      case "firstName":
        return a.firstName.localeCompare(b.firstName) * modifier;
      case "lastName":
        return a.lastName.localeCompare(b.lastName) * modifier;
      case "name":
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * modifier;
      case "memberNumber":
        return (a.memberNumber - b.memberNumber) * modifier;
      case "age":
        const ageA = calculateAge(a.birthDate) || 0;
        const ageB = calculateAge(b.birthDate) || 0;
        return (ageA - ageB) * modifier;
      case "registrationDate":
        return (new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()) * modifier;
      case "paymentStatus":
        // Voor paymentStatus, sorteren we paid eerst als asc, unpaid eerst als desc
        return ((a.paymentStatus === b.paymentStatus) ? 0 : a.paymentStatus ? -1 : 1) * modifier;
      default:
        return 0;
    }
  });
  
  // Toggle sorteerrichting of verander sorteerveld
  const toggleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Helper functie om filter waarden bij te werken
  const toggleFilter = (filter: string[], value: string): string[] => {
    if (filter.includes(value)) {
      // Als de waarde al in de lijst staat, verwijder deze
      return filter.filter(item => item !== value);
    } else {
      // Anders, voeg toe aan de lijst
      return [...filter, value];
    }
  };
  
  // Hier stond voorheen de exportToExcel functie die is verwijderd
  
  // Formateer een datum voor weergave in DD/MM/YYYY formaat
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "-";
    }
  };
  
  // Update mutation voor het bijwerken van een lid direct in de popup
  const updateMemberMutation = useMutation({
    mutationFn: async (data: MemberEditData) => {
      // Check of viewMember bestaat
      if (!viewMember) {
        throw new Error("Geen lid geselecteerd om bij te werken");
      }
      
      try {
        console.log("Versturen data naar API:", data);
        
        // Maak een kopie van de data die we gaan versturen
        const updateData = {
          ...data,
          // ID toevoegen van het huidige viewMember
          id: viewMember.id
        };
        
        // Verstuur het request
        const response = await apiRequest('PUT', `/api/members?id=${viewMember.id}`, updateData);
        
        // Check of het request gelukt is
        if (!response.ok) {
          const errorData = await response.text();
          console.error("API Error response:", errorData);
          
          try {
            const parsedError = JSON.parse(errorData);
            throw new Error(parsedError.error || 'Onbekende API fout');
          } catch (e) {
            throw new Error(`API fout (${response.status}): ${errorData || 'Geen details beschikbaar'}`);
          }
        }
        
        // Parse het resultaat
        const result = await response.json();
        console.log("API response:", result);
        return result;
      } catch (error) {
        console.error("Error in updateMemberMutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Update successful, received data:", data);
      
      // Vernieuw de query cache
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Update lokale state en sluit edit mode
      if (data) {
        setViewMember(data);
      }
      
      setEditMode(false);
      
      toast({
        title: "Lid bijgewerkt",
        description: "De gegevens zijn succesvol bijgewerkt.",
      });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Fout bij bijwerken",
        description: `Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        variant: "destructive",
      });
    }
  });
  
  // Functies voor de bewerkingsmodus in popup dialoog
  const handleEnableEditMode = () => {
    if (!viewMember) return;
    
    // Reset het formulier met de gegevens van het huidige lid
    form.reset({
      firstName: viewMember.firstName,
      lastName: viewMember.lastName,
      email: viewMember.email || "",
      phoneNumber: viewMember.phoneNumber,
      paymentStatus: viewMember.paymentStatus,
      notes: viewMember.notes || "",
      accountNumber: viewMember.accountNumber || "",
      birthDate: viewMember.birthDate || "",
      startDate: viewMember.startDate || viewMember.registrationDate // Gebruik registrationDate als fallback
    });
    
    setEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  const handleSaveEdit = (data: MemberEditData) => {
    console.log("Saving member data:", data);
    
    // Eenvoudigere aanpak: gebruik de data direct zoals deze is
    // Het schema handelt de conversie af met z.coerce.date()
    try {
      // Log voor debugging
      console.log("Submitting data to API:", data);
      
      // Stuur direct de data, zonder manipulatie
      updateMemberMutation.mutate(data);
    } catch (error) {
      console.error("Error in handleSaveEdit:", error);
      toast({
        title: "Fout bij verwerken formulier",
        description: "Er is een fout opgetreden bij het verwerken van het formulier. Probeer het opnieuw.",
        variant: "destructive"
      });
    }
  };
  
  // Functie om lid verwijderen te bevestigen
  const handleDeleteConfirm = (member: Member) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };
  
  // Functie om lid daadwerkelijk te verwijderen
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      console.log(`Verwijderen lid met ID: ${memberToDelete.id}`);
      const response = await apiRequest('DELETE', `/api/members?id=${memberToDelete.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Onbekende API fout');
      }
      
      // Vernieuw de ledenlijst na verwijderen - forceert een volledige refresh
      await queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Haal de leden opnieuw op om te bevestigen dat de verwijdering is gelukt
      const refreshResponse = await apiRequest("GET", "/api/members");
      const refreshedMembers = await refreshResponse.json();
      
      // Controleer of het lid daadwerkelijk is verwijderd
      const isStillPresent = refreshedMembers.some((m: Member) => m.id === memberToDelete.id);
      
      if (isStillPresent) {
        throw new Error('Lid kon niet worden verwijderd');
      }
      
      toast({
        title: "Lid verwijderd",
        description: `${memberToDelete.firstName} ${memberToDelete.lastName} is succesvol verwijderd.`,
      });
      
      // Sluit de dialog
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error("Fout bij verwijderen:", error);
      toast({
        title: "Fout bij verwijderen",
        description: `Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header section met gradient achtergrond - responsive */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-4 sm:p-6 shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Ledenlijst
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            Beheer en bekijk alle leden van Moskee MEFEN
          </p>
        </div>
      </div>
      
      {/* Actieve URL filter indicator */}
      {(() => {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        // Check of er URL filters actief zijn
        if (params.has("gender") || params.has("type") || params.has("voting")) {
          let filterText = "";
          let filterIcon = null;
          let bgColor = "";
          let textColor = "";
          
          if (params.has("gender")) {
            const gender = params.get("gender");
            if (gender === "man") {
              filterText = "Filter: Mannen";
              filterIcon = (
                <svg 
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1"
                >
                  <circle cx="12" cy="5" r="3"/>
                  <line x1="12" y1="8" x2="12" y2="21"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              );
              bgColor = "bg-blue-100";
              textColor = "text-blue-700";
            } else if (gender === "vrouw") {
              filterText = "Filter: Vrouwen";
              filterIcon = (
                <svg 
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1"
                >
                  <circle cx="12" cy="5" r="3"/>
                  <line x1="12" y1="8" x2="12" y2="21"/>
                  <circle cx="12" cy="16" r="5"/>
                </svg>
              );
              bgColor = "bg-pink-100";
              textColor = "text-pink-700";
            }
          } else if (params.has("type")) {
            const type = params.get("type");
            if (type === "standaard") {
              filterText = "Filter: Standaard lidmaatschap";
              filterIcon = <UserCheck className="h-4 w-4 mr-1" />;
              bgColor = "bg-amber-100";
              textColor = "text-amber-700";
            } else if (type === "student") {
              filterText = "Filter: Student lidmaatschap";
              filterIcon = <GraduationCap className="h-4 w-4 mr-1" />;
              bgColor = "bg-green-100";
              textColor = "text-green-700";
            } else if (type === "senior") {
              filterText = "Filter: Senior lidmaatschap";
              filterIcon = (
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1"
                >
                  <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
                  <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z" />
                  <path d="M5 18v2" />
                  <path d="M19 18v2" />
                </svg>
              );
              bgColor = "bg-purple-100";
              textColor = "text-purple-700";
            }
          } else if (params.has("voting") && params.get("voting") === "true") {
            filterText = "Filter: Stemgerechtigd";
            filterIcon = <UserCheck className="h-4 w-4 mr-1" />;
            bgColor = "bg-[#963E56]/20";
            textColor = "text-[#963E56]";
          }
          
          if (filterText) {
            return (
              <div className="my-4 flex items-center">
                <div className={`flex items-center px-3 py-1.5 rounded-lg ${bgColor} ${textColor}`}>
                  {filterIcon}
                  <span className="text-sm font-medium">{filterText}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-7 text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    // Verwijder alle filters en navigeer terug naar basis URL
                    window.history.replaceState({}, '', '/members');
                    // Herlaad de pagina om de filters te resetten
                    window.location.reload();
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">Wis filter</span>
                </Button>
              </div>
            );
          }
        }
        
        return <div className="my-4"></div>;
      })()}
      
      {/* Statistieken strook als actieve filters - klikbare kaarten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <button 
          onClick={() => setActiveFilter("all")}
          className={`text-left focus:outline-none rounded-lg ${
            activeFilter === "all" ? "focus:ring-2 focus:ring-blue-500" : ""
          }`}
        >
          <Card className={`overflow-hidden border-none shadow-md transition-all duration-200 ${
            activeFilter === "all" 
              ? "bg-blue-100 border-2 border-blue-500" 
              : "bg-blue-50 hover:bg-blue-100/70"
          }`}>
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-blue-100 mb-1 sm:mb-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600"/>
              </div>
              <div className="text-base sm:text-xl font-bold text-blue-600">
                {isLoading ? <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" /> : members.length}
              </div>
              <p className="text-[10px] sm:text-xs text-blue-800/70 text-center">Totaal leden</p>
              {activeFilter === "all" && (
                <div className="mt-1 bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-[8px] sm:text-[10px]">
                </div>
              )}
            </CardContent>
          </Card>
        </button>
        
        <button 
          onClick={() => activeFilter === "paid" ? setActiveFilter("all") : setActiveFilter("paid")}
          className={`text-left focus:outline-none rounded-lg ${
            activeFilter === "paid" ? "focus:ring-2 focus:ring-green-500" : ""
          }`}
        >
          <Card className={`overflow-hidden border-none shadow-md transition-all duration-200 ${
            activeFilter === "paid" 
              ? "bg-green-100 border-2 border-green-500" 
              : "bg-green-50 hover:bg-green-100/70"
          }`}>
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-green-100 mb-1 sm:mb-2">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-green-600"/>
              </div>
              <div className="text-base sm:text-xl font-bold text-green-600">
                {isLoading ? <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" /> : members.filter(m => m.paymentStatus).length}
              </div>
              <p className="text-[10px] sm:text-xs text-green-800/70 text-center">Betaald</p>
              {activeFilter === "paid" && (
                <div className="mt-1 bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-[8px] sm:text-[10px]">
                </div>
              )}
            </CardContent>
          </Card>
        </button>
        
        <button 
          onClick={() => activeFilter === "unpaid" ? setActiveFilter("all") : setActiveFilter("unpaid")}
          className={`text-left focus:outline-none rounded-lg ${
            activeFilter === "unpaid" ? "focus:ring-2 focus:ring-red-500" : ""
          }`}
        >
          <Card className={`overflow-hidden border-none shadow-md transition-all duration-200 ${
            activeFilter === "unpaid" 
              ? "bg-red-100 border-2 border-red-500" 
              : "bg-red-50 hover:bg-red-100/70"
          }`}>
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-red-100 mb-1 sm:mb-2">
                <div className="relative">
                  <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 sm:w-6 h-0.5 bg-red-600 rotate-45 transform origin-center"></div>
                  </div>
                </div>
              </div>
              <div className="text-base sm:text-xl font-bold text-red-600">
                {isLoading ? <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" /> : members.length - members.filter(m => m.paymentStatus).length}
              </div>
              <p className="text-[10px] sm:text-xs text-red-800/70 text-center">Niet betaald</p>
              {activeFilter === "unpaid" && (
                <div className="mt-1 bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-[8px] sm:text-[10px]">
                </div>
              )}
            </CardContent>
          </Card>
        </button>
        
        <div className="rounded-lg">
          <Card className="overflow-hidden border-none shadow-md bg-purple-50">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-purple-100 mb-1 sm:mb-2">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600"/>
              </div>
              <div className="text-base sm:text-xl font-bold text-purple-600">
                {isLoading ? (
                  <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" />
                ) : (
                  members.length > 0
                    ? (() => {
                        const date = new Date(Math.max(...members.map(m => new Date(m.registrationDate).getTime())));
                        // Gebruik korte notatie DD/MM/JJ
                        const day = date.getDate();
                        const month = date.getMonth() + 1;
                        // Gebruik alleen de laatste twee cijfers van het jaar
                        const year = date.getFullYear().toString().slice(-2);
                        return `${day}/${month}/${year}`;
                      })()
                    : "-"
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-purple-800/70 text-center">Laatste registratie</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#963E56]" /> Ledenbestand
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {sortedMembers.length} leden gevonden
            {searchQuery ? ` voor zoekterm "${searchQuery}"` : ""}
            {activeFilter !== "all" && (
              <span className="block mt-1">
                <Badge variant="outline" className="bg-gray-50 text-[10px]">
                  {activeFilter === "paid" && "Filter: Alleen betaalde leden"}
                  {activeFilter === "unpaid" && "Filter: Alleen niet-betaalde leden"}
                  {/* Alle filters behouden in de filter badge */}
          {activeFilter === "recent" && "Filter: Alleen recent toegevoegde leden"} 
                  <button 
                    onClick={() => setActiveFilter("all")} 
                    className="ml-1 bg-gray-200 hover:bg-gray-300 rounded-full h-3 w-3 inline-flex items-center justify-center"
                  >
                    <X className="h-2 w-2 text-gray-500" />
                  </button>
                </Badge>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </div>
              <Input
                type="search"
                placeholder="Zoeken op naam, lidnummer..."
                className="pl-10 py-5 sm:py-6 text-sm sm:text-base border-gray-200 bg-gray-50 focus:bg-white transition-colors shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className={`md:w-auto w-full mt-2 md:mt-0 bg-white border-gray-200 text-xs sm:text-sm ${showFilters ? 'border-[#963E56] bg-pink-50' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className={`h-3.5 w-3.5 mr-2 ${showFilters ? 'text-[#963E56]' : ''}`} />
              Filters {showFilters ? 'verbergen' : 'tonen'}
              {showFilters ? <ChevronUp className="ml-2 h-3.5 w-3.5" /> : <ChevronDown className="ml-2 h-3.5 w-3.5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="md:w-auto w-full mt-2 md:mt-0 bg-white border-gray-200 text-xs sm:text-sm"
                >
                  {sortDirection === "asc" ? <SortAsc className="h-3.5 w-3.5 mr-2" /> : <SortDesc className="h-3.5 w-3.5 mr-2" />}
                  Sorteren op: {sortField === "firstName" ? "Voornaam" :
                    sortField === "lastName" ? "Naam" :
                    sortField === "name" ? "Volledige naam" : 
                    sortField === "memberNumber" ? "Lidnummer" : 
                    sortField === "age" ? "Leeftijd" : 
                    sortField === "registrationDate" ? "Registratiedatum" : 
                    sortField === "paymentStatus" ? "Betaalstatus" : "Naam"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup value={sortField} onValueChange={(value) => {
                  if (value === sortField) {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField(value);
                    setSortDirection("asc");
                  }
                }}>
                  {/* Sorteren op lidnummer */}
                  <DropdownMenuRadioItem value="memberNumber" className="text-xs sm:text-sm cursor-pointer">
                    Op lidnummer {sortField === "memberNumber" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  
                  {/* Sorteren op naam */}
                  <DropdownMenuRadioItem value="lastName" className="text-xs sm:text-sm cursor-pointer">
                    Op naam {sortField === "lastName" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  
                  {/* Sorteren op voornaam */}
                  <DropdownMenuRadioItem value="firstName" className="text-xs sm:text-sm cursor-pointer">
                    Op voornaam {sortField === "firstName" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  
                  {/* Sorteren op leeftijd */}
                  <DropdownMenuRadioItem value="age" className="text-xs sm:text-sm cursor-pointer">
                    Op leeftijd {sortField === "age" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  
                  {/* Sorteren op betaalstatus */}
                  <DropdownMenuRadioItem value="paymentStatus" className="text-xs sm:text-sm cursor-pointer">
                    Op betaalstatus {sortField === "paymentStatus" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  
                  {/* Scheidingslijn voor overige sorteeropties */}
                  <DropdownMenuSeparator />
                  
                  {/* Overige sorteeropties */}
                  <DropdownMenuRadioItem value="name" className="text-xs sm:text-sm cursor-pointer">
                    Op volledige naam {sortField === "name" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  
                  <DropdownMenuRadioItem value="registrationDate" className="text-xs sm:text-sm cursor-pointer">
                    Op registratiedatum {sortField === "registrationDate" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filter-paneel */}
          {showFilters && (
            <div className="mb-6 p-4 border border-gray-200 bg-gray-50 rounded-lg shadow-sm">
              <div className="mb-3 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Uitgebreide filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setVotingFilter([]);
                    setMembershipTypeFilter([]);
                    setPaymentTermFilter([]);
                    setPaymentMethodFilter([]);
                    setGenderFilter([]);
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Wis filters
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Filter op stemgerechtigdheid */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <svg 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-3.5 w-3.5 text-[#963E56]"
                     >
                      <path d="m9 12 2 2 4-4" />
                      <path d="M12 3c-1.2 0-2.4.6-3 1.7A3.6 3.6 0 0 0 4.6 9c-1 .6-1.7 1.8-1.7 3s.7 2.4 1.7 3c-.3 1.2 0 2.5 1 3.4.8.8 2.1 1.2 3.3 1 .6 1 1.8 1.6 3 1.6s2.4-.6 3-1.7c1.2.3 2.5 0 3.4-1 .8-.8 1.2-2 1-3.3 1-.6 1.7-1.8 1.7-3s-.7-2.4-1.7-3c.3-1.2 0-2.5-1-3.4a3.7 3.7 0 0 0-3.3-1c-.6-1-1.8-1.6-3-1.6Z" />
                    </svg>
                    Stemgerechtigdheid
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${votingFilter.includes('eligible') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setVotingFilter(toggleFilter(votingFilter, 'eligible'))}
                    >
                      Stemgerechtigd
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${votingFilter.includes('not-eligible') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setVotingFilter(toggleFilter(votingFilter, 'not-eligible'))}
                    >
                      Niet stemgerechtigd
                    </Button>
                  </div>
                </div>
                
                {/* Filter op lidmaatschapstype */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-[#963E56]" />
                    Lidmaatschapstype
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${membershipTypeFilter.includes('standaard') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setMembershipTypeFilter(toggleFilter(membershipTypeFilter, 'standaard'))}
                    >
                      Standaard
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${membershipTypeFilter.includes('student') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setMembershipTypeFilter(toggleFilter(membershipTypeFilter, 'student'))}
                    >
                      Student
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${membershipTypeFilter.includes('senior') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setMembershipTypeFilter(toggleFilter(membershipTypeFilter, 'senior'))}
                    >
                      Senior
                    </Button>
                  </div>
                </div>
                
                {/* Filter op betalingstermijn */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-[#963E56]" />
                    Betaaltermijn
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${paymentTermFilter.includes('jaarlijks') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setPaymentTermFilter(toggleFilter(paymentTermFilter, 'jaarlijks'))}
                    >
                      Jaarlijks
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${paymentTermFilter.includes('maandelijks') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setPaymentTermFilter(toggleFilter(paymentTermFilter, 'maandelijks'))}
                    >
                      Maandelijks
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${paymentTermFilter.includes('driemaandelijks') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setPaymentTermFilter(toggleFilter(paymentTermFilter, 'driemaandelijks'))}
                    >
                      Driemaandelijks
                    </Button>
                  </div>
                </div>
                
                {/* Filter op betaalmethode */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-[#963E56]" />
                    Betaalmethode
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${paymentMethodFilter.includes('automatisch') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setPaymentMethodFilter(toggleFilter(paymentMethodFilter, 'automatisch'))}
                    >
                      Automatisch
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${paymentMethodFilter.includes('overschrijving') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setPaymentMethodFilter(toggleFilter(paymentMethodFilter, 'overschrijving'))}
                    >
                      Overschrijving
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${paymentMethodFilter.includes('contant') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setPaymentMethodFilter(toggleFilter(paymentMethodFilter, 'contant'))}
                    >
                      Contant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${paymentMethodFilter.includes('bancontact') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setPaymentMethodFilter(toggleFilter(paymentMethodFilter, 'bancontact'))}
                    >
                      Bancontact
                    </Button>
                  </div>
                </div>
                
                {/* Filter op geslacht */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#963E56]" />
                    Geslacht
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${genderFilter.includes('man') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setGenderFilter(toggleFilter(genderFilter, 'man'))}
                    >
                      Man
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${genderFilter.includes('vrouw') ? 'bg-[#963E56]/10 text-[#963E56] border-[#963E56]/30' : ''}`}
                      onClick={() => setGenderFilter(toggleFilter(genderFilter, 'vrouw'))}
                    >
                      Vrouw
                    </Button>
                  </div>
                </div>


              </div>
            </div>
          )}
          
          <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("memberNumber")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Lidnr.
                      {sortField === "memberNumber" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("firstName")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Voornaam
                      {sortField === "firstName" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("lastName")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Naam
                      {sortField === "lastName" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("age")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Geboortedatum
                      {sortField === "age" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("paymentStatus")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Betaalstatus
                      {sortField === "paymentStatus" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => {
                        // Reset alle individuele delete iconen
                        setMembers(members.map(m => ({ ...m, showDelete: false })));
                        // Toggle globale delete modus
                        setShowDeleteIcons(!showDeleteIcons);
                      }} 
                      className="ml-auto flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Acties
                      {/* drie puntjes verwijderd op verzoek van de gebruiker */}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Users className="h-10 w-10 mb-2 text-gray-300" />
                        <p className="mb-1">Geen leden gevonden</p>
                        <p className="text-sm text-gray-400">
                          {searchQuery ? 
                            "Probeer een andere zoekterm of voeg een nieuw lid toe" : 
                            "Voeg een nieuw lid toe om te beginnen"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedMembers.map((member) => (
                    <TableRow key={member?.id || 'unknown'} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                        <div className="flex items-center">
                          <button 
                            className="text-[#963E56] hover:text-[#7e3447] hover:underline cursor-pointer font-medium"
                            onClick={() => navigate(`/member-detail?id=${member.id}`)}
                          >
                            {member?.memberNumber !== undefined 
                              ? member.memberNumber.toString().padStart(4, '0')
                              : "----"}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                        {member?.firstName || ""}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                        {member?.lastName || ""}
                      </TableCell>
                      <TableCell className="text-gray-600 text-xs sm:text-sm py-2 sm:py-4">
                        {formatDate(member?.birthDate)}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <Badge 
                          variant={member?.paymentStatus ? "default" : "outline"}
                          className={`text-[10px] sm:text-xs min-w-[110px] text-center ${member?.paymentStatus 
                            ? "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
                            : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"}`}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            {member?.paymentStatus ? (
                              <>
                                <Banknote className="h-3 w-3 text-green-600" />
                                <span className="w-[80px] text-center">Betaald</span>
                              </>
                            ) : (
                              <>
                                <div className="relative h-3 w-3">
                                  <Banknote className="h-3 w-3 text-red-600" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-0.5 bg-red-600 rotate-45 transform origin-center"></div>
                                  </div>
                                </div>
                                <span className="w-[80px] text-center">Niet betaald</span>
                              </>
                            )}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ml-auto ${member.showDelete ? "text-red-600 hover:text-red-800 hover:bg-red-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                          onClick={() => {
                            if (member.showDelete) {
                              // Als de prullenbak wordt getoond, verwijder het lid
                              handleDeleteConfirm(member);
                            } else {
                              // Anders, toon de prullenbak voor alleen dit lid
                              setMembers(members.map(m => ({
                                ...m,
                                showDelete: m.id === member.id ? true : m.showDelete
                              })));
                            }
                          }}
                        >
                          {member.showDelete ? (
                            <Trash2 className="h-4 w-4" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                          <span className="sr-only">{member.showDelete ? "Lid verwijderen" : "Meer acties"}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Lid details dialoog */}
      {viewMember && (
        <Dialog open={!!viewMember} onOpenChange={(open) => {
          if (!open) {
            setViewMember(null);
            setEditMode(false);
          }
        }}>
          <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-[#963E56]/90 to-[#963E56] p-4 sm:p-6 text-white">
              <DialogHeader className="text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-lg sm:text-xl text-white">
                        {viewMember?.firstName || ""} {viewMember?.lastName || ""}
                      </DialogTitle>
                      
                      {/* Badge rechts naast de naam */}
                      {viewMember && isVotingEligible(viewMember) && (
                        <div className="bg-white/20 py-0.5 px-2.5 rounded-full border border-white/30 flex items-center gap-1">
                          <svg 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="h-3 w-3 text-white"
                          >
                            <path d="m9 12 2 2 4-4" />
                            <path d="M12 3c-1.2 0-2.4.6-3 1.7A3.6 3.6 0 0 0 4.6 9c-1 .6-1.7 1.8-1.7 3s.7 2.4 1.7 3c-.3 1.2 0 2.5 1 3.4.8.8 2.1 1.2 3.3 1 .6 1 1.8 1.6 3 1.6s2.4-.6 3-1.7c1.2.3 2.5 0 3.4-1 .8-.8 1.2-2 1-3.3 1-.6 1.7-1.8 1.7-3s-.7-2.4-1.7-3c.3-1.2 0-2.5-1-3.4a3.7 3.7 0 0 0-3.3-1c-.6-1-1.8-1.6-3-1.6Z" />
                          </svg>
                          <span className="text-xs text-white font-medium">Stemgerechtigd</span>
                        </div>
                      )}
                    </div>
                    <DialogDescription className="text-white/80 text-xs sm:text-sm mt-1">
                      Lidnummer: {viewMember?.memberNumber !== undefined ? viewMember.memberNumber.toString().padStart(4, '0') : "----"} 
                      • Lid sinds {formatDate(viewMember?.startDate || viewMember?.registrationDate)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>
            
            {editMode ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveEdit)} className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                        Persoonlijke gegevens
                      </h3>
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Voornaam</FormLabel>
                              <FormControl>
                                <Input {...field} />
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
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => {
                            // Gebruik een gewoon invoerveld voor geboortedatum in DD/MM/YYYY formaat
                            const [dateInput, setDateInput] = useState(
                              field.value ? format(new Date(field.value), "dd/MM/yyyy") : ""
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
                              
                              // Retourneer het volledige ISO-string formaat, zoals de server verwacht
                              return date.toISOString();
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
                                console.log("DateInput waarde bij blur:", dateInput);
                                const parsedDate = validateAndParseDate(dateInput);
                                console.log("Parsed date result:", parsedDate);
                                
                                if (parsedDate) {
                                  console.log("Setting field value to:", parsedDate);
                                  field.onChange(parsedDate);
                                } else {
                                  // Als datum ongeldig is, reset naar vorige geldige waarde
                                  console.log("Invalid date, resetting to previous value");
                                  setDateInput(field.value ? format(new Date(field.value), "dd/MM/yyyy") : "");
                                }
                              } else {
                                console.log("Empty date input, setting field to undefined");
                                field.onChange(undefined);
                              }
                            };
                            
                            return (
                              <FormItem>
                                <FormLabel>Geboortedatum</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="DD/MM/JJJJ"
                                    value={dateInput}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => {
                            // Gebruik een gewoon invoerveld voor startdatum in DD/MM/YYYY formaat
                            const [dateInput, setDateInput] = useState(
                              field.value ? format(new Date(field.value), "dd/MM/yyyy") : ""
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
                              
                              // Retourneer het volledige ISO-string formaat, zoals de server verwacht
                              return date.toISOString();
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
                                console.log("StartDateInput waarde bij blur:", dateInput);
                                const parsedDate = validateAndParseDate(dateInput);
                                console.log("Parsed start date result:", parsedDate);
                                
                                if (parsedDate) {
                                  console.log("Setting startDate field value to:", parsedDate);
                                  field.onChange(parsedDate);
                                } else {
                                  // Als datum ongeldig is, reset naar vorige geldige waarde
                                  console.log("Invalid start date, resetting to previous value");
                                  setDateInput(field.value ? format(new Date(field.value), "dd/MM/yyyy") : "");
                                }
                              } else {
                                console.log("Empty start date input, setting field to undefined");
                                field.onChange(undefined);
                              }
                            };
                            
                            return (
                              <FormItem>
                                <FormLabel>Startdatum lidmaatschap</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="DD/MM/JJJJ"
                                    value={dateInput}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                        Contactgegevens
                      </h3>
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mailadres</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="Optioneel" />
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
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rekeningnummer</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Optioneel" value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="paymentStatus"
                      render={({ field }) => (
                        <FormItem className="bg-gray-50 p-4 rounded-lg flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Lidmaatschap betaald</FormLabel>
                            <p className="text-sm text-gray-500">
                              Vink aan als het lidmaatschap voor dit jaar is betaald
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  

                  
                  <div className="border-t mt-6 pt-6 flex flex-col sm:flex-row sm:justify-between gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => navigate(`/member-add?id=${viewMember.id}`)}
                      className="text-gray-700 text-xs sm:text-sm"
                    >
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      Meer...
                    </Button>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={handleCancelEdit}
                        className="order-1 sm:order-1"
                      >
                        Annuleren
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateMemberMutation.isPending}
                        className="bg-[#963E56] hover:bg-[#7e3447] order-0 sm:order-2"
                      >
                        {updateMemberMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Bezig met opslaan...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Wijzigingen opslaan
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            ) : (
              <>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                        Persoonlijke gegevens
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Naam</div>
                          <div className="font-medium text-sm sm:text-base">{viewMember.firstName} {viewMember.lastName}</div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Geboortedatum</div>
                          <div className="font-medium text-sm sm:text-base">{formatDate(viewMember.birthDate)}</div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Geslacht</div>
                          <div className="font-medium text-sm sm:text-base">{viewMember.gender === "man" ? "Man" : viewMember.gender === "vrouw" ? "Vrouw" : "Niet opgegeven"}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center mt-4 md:mt-0">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                        Contactgegevens
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Telefoon</div>
                          <div className="font-medium text-sm sm:text-base">{formatPhoneNumber(viewMember.phoneNumber)}</div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">E-mail</div>
                          <div className="font-medium text-sm sm:text-base">{viewMember.email || "Niet opgegeven"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                      Betaalgegevens
                    </h3>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {viewMember.accountNumber && (
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">IBAN</div>
                          <div className="font-medium text-sm sm:text-base">{viewMember.accountNumber}</div>
                        </div>
                      )}
                      
                      <div className="flex items-center p-3 sm:p-4 rounded-lg bg-gray-50 gap-3 sm:gap-4">
                        <div className={`p-2 sm:p-3 rounded-full ${viewMember.paymentStatus ? 'bg-green-100' : 'bg-red-100'}`}>
                          {viewMember.paymentStatus ? (
                            <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          ) : (
                            <div className="relative">
                              <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-5 sm:w-6 h-0.5 bg-red-600 rotate-45 transform origin-center"></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm text-gray-500">Betaalstatus</div>
                          <div className="text-sm sm:text-base font-medium">
                            {viewMember.paymentStatus ? "Betaald" : "Niet betaald"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stemrecht sectie verwijderd - badge wordt nu in de header getoond */}
                  

                </div>
                
                <div className="border-t p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-end gap-2 bg-gray-50">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewMember(null)}
                    className="border-gray-300 text-gray-700 text-xs sm:text-sm w-full sm:w-auto order-2 sm:order-1"
                  >
                    Sluiten
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleEnableEditMode}
                    className="bg-[#963E56] hover:bg-[#7e3447] text-white text-xs sm:text-sm w-full sm:w-auto order-1 sm:order-2"
                  >
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Bewerken
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
      
      {/* Verwijder bevestiging dialoog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Lid verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je dit lid wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          {memberToDelete && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="font-medium">{memberToDelete.firstName} {memberToDelete.lastName}</div>
              <div className="text-sm text-gray-500">Lidnummer: {memberToDelete.memberNumber.toString().padStart(4, '0')}</div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="mr-2"
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}