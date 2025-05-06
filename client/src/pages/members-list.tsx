import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member, insertMemberSchema } from "@shared/schema";
import { fetchMembersFromFirebase, subscribeMembersFromFirebase } from "@/lib/firebase-members";
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
  CalendarDays, Check, X, Users, User, Phone, StickyNote, Edit,
  SortAsc, SortDesc, Trash2, ArrowUpDown, Filter
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
import { z } from "zod";
import { nl } from "date-fns/locale";

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
}).omit({ id: true, memberNumber: true, registrationDate: true });

type MemberEditData = z.infer<typeof memberEditSchema>;

export default function MembersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<"all" | "paid" | "unpaid" | "recent">("all");
  const [sortField, setSortField] = useState<string>("memberNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [, navigate] = useLocation();
  
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
      accountNumber: ""
    }
  });
  
  // Gebruik Firebase fallback state
  const [firebaseMembers, setFirebaseMembers] = useState<Member[]>([]);
  const [usingFirebaseFallback, setUsingFirebaseFallback] = useState(false);
  
  // Haal alle leden op, eerst via API en als fallback via Firebase
  const { data: members = [], isLoading, isError, error } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      try {
        // Vercel production modus check - in productie direct Firebase proberen
        const isProduction = window.location.hostname.includes('vercel.app');
        if (isProduction) {
          try {
            // Probeer eerst API in productie
            console.log("API request naar /api/members in productie");
            const response = await apiRequest("GET", "/api/members");
            const data = await response.json();
            console.log("API response ontvangen in productie:", data);
            return data;
          } catch (apiError) {
            console.warn("API fout in productie, fallback naar Firebase:", apiError);
            console.log("Leden ophalen via Firebase fallback...");
            const firebaseData = await fetchMembersFromFirebase();
            setUsingFirebaseFallback(true);
            setFirebaseMembers(firebaseData);
            return firebaseData;
          }
        }
        
        // Normale API aanroep in development
        console.log("API request naar /api/members gestart");
        const response = await apiRequest("GET", "/api/members");
        const data = await response.json();
        console.log("API response ontvangen:", data);
        return data;
      } catch (error) {
        console.error("Fout bij ophalen leden via API, probeer Firebase fallback:", error);
        
        try {
          // API fout, probeer Firebase als fallback
          const firebaseData = await fetchMembersFromFirebase();
          setUsingFirebaseFallback(true);
          setFirebaseMembers(firebaseData);
          return firebaseData;
        } catch (fbError) {
          console.error("Ook Firebase fallback faalde:", fbError);
          // Als beide falen, toon dan een foutmelding
          throw new Error("Kon geen leden ophalen via API of Firebase. Controleer je verbinding.");
        }
      }
    },
    // Retry bij fouten, belangrijk voor serverless functies in Vercel
    retry: 1, // Minder retries want we hebben nu Firebase als fallback
    retryDelay: 1000,
  });
  
  // Firebase realtime subscribtion als fallback wordt gebruikt
  useEffect(() => {
    // Als we de Firebase fallback gebruiken, luister dan naar wijzigingen
    if (usingFirebaseFallback) {
      console.log("Realtime updates inschakelen via Firebase...");
      const unsubscribe = subscribeMembersFromFirebase((updatedMembers) => {
        console.log("Realtime update ontvangen:", updatedMembers.length, "leden");
        setFirebaseMembers(updatedMembers);
      });
      
      // Cleanup functie
      return () => {
        console.log("Firebase realtime updates uitschakelen");
        unsubscribe();
      };
    }
  }, [usingFirebaseFallback]);
  
  // Filter leden op basis van zoekopdracht en actieve filter
  const filteredMembers = members.filter(member => {
    // Eerst op zoekopdracht filteren
    const matchesSearch = searchQuery === "" || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.memberNumber?.toString().includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.phoneNumber.includes(searchQuery);
    
    // Vervolgens op actieve filter
    let matchesFilter = true;
    if (activeFilter === "paid") {
      matchesFilter = member.paymentStatus === true;
    } else if (activeFilter === "unpaid") {
      matchesFilter = member.paymentStatus === false;
    } else if (activeFilter === "recent") {
      // Beschouw "recent" als lid geworden in de afgelopen 30 dagen
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesFilter = new Date(member.registrationDate) >= thirtyDaysAgo;
    }
    
    return matchesSearch && matchesFilter;
  });

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
      if (!viewMember) return null;
      
      try {
        // Normale API aanroep proberen
        const response = await apiRequest('PUT', `/api/members?id=${viewMember.id}`, data);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Onbekende API fout');
        }
        
        return response.json();
      } catch (apiError) {
        // Als we al in Firebase fallback mode zijn, probeer direct naar Firebase te schrijven
        if (usingFirebaseFallback && database) {
          console.warn("API update gefaald, probeer direct Firebase update...", apiError);
          
          try {
            // Directe Firebase update als fallback voor API in offline modus
            const updatedMember = {
              ...viewMember,
              ...data,
              updatedAt: new Date().toISOString()
            };
            
            // Bepaal de Firebase key - meestal de ID van het lid
            const memberRef = ref(database, `members/${viewMember.id}`);
            await set(memberRef, updatedMember);
            
            console.log("Firebase directe update succesvol");
            return updatedMember;
          } catch (firebaseError) {
            console.error("Ook Firebase fallback update gefaald:", firebaseError);
            throw new Error("Kon lid niet bijwerken via API of Firebase");
          }
        } else {
          // Als we niet in Firebase fallback mode zijn, gooi de originele fout
          throw apiError;
        }
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Controleer of we geldige data hebben ontvangen
      if (data && data.id) {
        setViewMember(data);
        
        // Als we in Firebase fallback mode zijn, update de lokale staat direct
        if (usingFirebaseFallback) {
          setFirebaseMembers(prevMembers => {
            return prevMembers.map(m => m.id === data.id ? data : m);
          });
        }
      } else {
        // Als er geen geldige data is, haal dan alle leden opnieuw op
        queryClient.fetchQuery({ queryKey: ['/api/members'] });
      }
      
      setEditMode(false);
      toast({
        title: "Lid bijgewerkt",
        description: "De gegevens zijn succesvol bijgewerkt.",
      });
    },
    onError: (error) => {
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
      birthDate: viewMember.birthDate || ""
    });
    
    setEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  const handleSaveEdit = (data: MemberEditData) => {
    updateMemberMutation.mutate(data);
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
      
      {/* Firebase fallback notificatie */}
      {usingFirebaseFallback && (
        <Card className="border-amber-200 shadow-md bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700 flex items-center gap-2 text-base">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 17v-4h4" />
                <path d="M4.9 4H3s.1 1 .1 3c0 2.5-.5 3-2 3m17 7c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5c-.7.7-1.5 1-2.5 1s-1.8-.3-2.5-1M3 3l18 18" />
              </svg>
              Offline Modus
            </CardTitle>
            <CardDescription className="text-amber-800 text-xs">
              Je werkt momenteel met lokaal opgeslagen ledenprofiel data. Wijzigingen worden automatisch gesynchroniseerd zodra je weer online bent.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {/* Foutmelding als de API niet werkt */}
      {isError && !usingFirebaseFallback && (
        <Card className="border-red-200 shadow-md bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <X className="h-5 w-5" /> API Fout
            </CardTitle>
            <CardDescription className="text-red-700">
              Er is een probleem met het ophalen van de leden. Probeer de pagina te verversen of controleer je internetverbinding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 overflow-auto max-h-24">
              {error instanceof Error ? error.message : 'Onbekende fout bij het ophalen van gegevens'}
            </p>
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="text-xs"
              >
                <span className="mr-2">Pagina verversen</span>
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Ruimte voor header en statistieken */}
      <div className="my-4"></div>
      
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
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600"/>
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
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600"/>
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
                        try {
                          // Filter eerst op geldige datums
                          const validDates = members
                            .filter(m => m.registrationDate && !isNaN(new Date(m.registrationDate).getTime()))
                            .map(m => new Date(m.registrationDate).getTime());
                          
                          // Als er geen geldige datums zijn
                          if (validDates.length === 0) return "-";
                          
                          const date = new Date(Math.max(...validDates));
                          
                          // Controleer of de datum geldig is
                          if (isNaN(date.getTime())) return "-";
                          
                          // Gebruik korte notatie DD/MM/JJ
                          const day = date.getDate();
                          const month = date.getMonth() + 1;
                          // Gebruik alleen de laatste twee cijfers van het jaar
                          const year = date.getFullYear().toString().slice(-2);
                          return `${day}/${month}/${year}`;
                        } catch (error) {
                          console.error("Fout bij berekenen laatste registratie:", error);
                          return "-";
                        }
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
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
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
                  <TableHead className="hidden md:table-cell font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
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
                  <TableHead className="hidden md:table-cell font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">E-mail</TableHead>
                  <TableHead className="hidden md:table-cell font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">Telefoon</TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("paymentStatus")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Status
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
                  <TableHead className="text-right font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
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
                    <TableRow key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-[#963E56] text-xs sm:text-sm py-2 sm:py-4">
                        {member.memberNumber.toString().padStart(4, '0')}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                        {member.firstName}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                        {member.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600 text-xs sm:text-sm py-2 sm:py-4">
                        {formatDate(member.birthDate)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600 text-xs sm:text-sm py-2 sm:py-4">
                        {member.email || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600 text-xs sm:text-sm py-2 sm:py-4">
                        {member.phoneNumber ? formatPhoneNumber(member.phoneNumber) : "-"}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <Badge 
                          variant={member.paymentStatus ? "default" : "outline"}
                          className={`text-[10px] sm:text-xs ${member.paymentStatus 
                            ? "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
                            : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"}`}
                        >
                          {member.paymentStatus 
                            ? "✓ Betaald" 
                            : "Niet betaald"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setViewMember(member)}
                            title="Details bekijken"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Details bekijken</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteConfirm(member)}
                            title="Lid verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Lid verwijderen</span>
                          </Button>
                        </div>
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
                <DialogTitle className="text-lg sm:text-xl text-white">
                  {viewMember.firstName} {viewMember.lastName}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-xs sm:text-sm">
                  Lidnummer: {viewMember.memberNumber.toString().padStart(4, '0')} • Lid sinds {formatDate(viewMember.registrationDate)}
                </DialogDescription>
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
                              
                              return date.toISOString().split('T')[0]; // Retourneer als YYYY-MM-DD string
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
                                  setDateInput(field.value ? format(new Date(field.value), "dd/MM/yyyy") : "");
                                }
                              } else {
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
                  
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notities</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Optionele notities over dit lid" 
                              className="min-h-[120px] resize-y"
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="border-t mt-6 pt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
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
                          <div className="text-xs sm:text-sm text-gray-500">Volledige naam</div>
                          <div className="font-medium text-sm sm:text-base">{viewMember.firstName} {viewMember.lastName}</div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Geboortedatum</div>
                          <div className="font-medium text-sm sm:text-base">{formatDate(viewMember.birthDate)}</div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Lid sinds</div>
                          <div className="font-medium text-sm sm:text-base">{formatDate(viewMember.registrationDate)}</div>
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
                          <div className="text-xs sm:text-sm text-gray-500">E-mail</div>
                          <div className="font-medium text-sm sm:text-base">{viewMember.email || "Niet opgegeven"}</div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Telefoon</div>
                          <div className="font-medium text-sm sm:text-base">{formatPhoneNumber(viewMember.phoneNumber)}</div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <div className="text-xs sm:text-sm text-gray-500">Rekeningnummer</div>
                          <div className="font-medium text-sm sm:text-base">{viewMember.accountNumber || "Niet opgegeven"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-6 flex items-center p-3 sm:p-4 rounded-lg bg-gray-50 gap-3 sm:gap-4">
                    <div className={`p-2 sm:p-3 rounded-full ${viewMember.paymentStatus ? 'bg-green-100' : 'bg-red-100'}`}>
                      {viewMember.paymentStatus ? (
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Betaalstatus</div>
                      <div className="text-sm sm:text-base font-medium">
                        {viewMember.paymentStatus ? "Betaald" : "Niet betaald"}
                      </div>
                    </div>
                  </div>
                  
                  {viewMember.notes && (
                    <div className="mt-4 sm:mt-6">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                        <StickyNote className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                        Notities
                      </h3>
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg whitespace-pre-wrap text-gray-600 text-xs sm:text-sm">
                        {viewMember.notes}
                      </div>
                    </div>
                  )}
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