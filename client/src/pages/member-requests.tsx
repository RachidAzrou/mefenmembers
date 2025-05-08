import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { 
  CheckIcon, 
  Loader2, 
  ShieldAlertIcon, 
  XIcon,
  X,
  AlertCircle,
  XCircle,
  Search, 
  ArrowLeft,
  PencilIcon,
  Save,
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  CreditCard as CreditCardIcon,
  User as UserIcon,
  Mail as MailIcon,
  UserPlus as UserPlusIcon,
  Eye,
  Trash2,
  Clock
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useRole } from "@/hooks/use-role";
import { 
  MembershipCard, 
  LocationCard, 
  PaymentDetailsCard,
  formatMembershipTypeLabel,
  formatPaymentMethodLabel,
  formatPaymentTermLabel,
  formatAutoRenewLabel
} from "@/components/RequestDetailViewCards";

// Type voor lidmaatschapsaanvragen
interface MemberRequest {
  id: number;
  status: "pending" | "approved" | "rejected";
  firstName: string;
  lastName: string;
  gender: string | null;
  birthDate: string | null;
  nationality: string | null;
  email: string;
  phoneNumber: string;
  street: string | null;
  houseNumber: string | null;
  busNumber: string | null;
  postalCode: string | null;
  city: string | null;
  membershipType: "standaard" | "student" | "senior";
  requestDate: string;
  processedDate: string | null;
  processedBy: number | null;
  notes: string | null;
  privacyConsent: boolean;
  // Uitgebreide velden voor betaling en bankgegevens
  paymentMethod?: "cash" | "domiciliering" | "overschrijving" | "bancontact";
  paymentTerm?: "maandelijks" | "driemaandelijks" | "jaarlijks";
  autoRenew?: boolean;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  bicSwift?: string | null;
  rejectionReason?: string | null;
  // Velden voor goedgekeurde aanvragen
  memberId?: number | null;
  memberNumber?: string | null;
}

export default function MemberRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  // Om TypeScript fouten te voorkomen, maken we een volledig type voor een bewerkte aanvraag
  type EditableMemberRequest = {
    [K in keyof MemberRequest]: MemberRequest[K];
  } & {
    paymentMethod: "cash" | "domiciliering" | "overschrijving" | "bancontact";
    paymentTerm: "maandelijks" | "driemaandelijks" | "jaarlijks";
    autoRenew: boolean;
    accountNumber: string | null;
    accountHolderName: string | null;
    bicSwift: string | null;
  };
  
  const [selectedRequest, setSelectedRequest] = useState<MemberRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editedRequest, setEditedRequest] = useState<Partial<EditableMemberRequest> | null>(null);
  const [nextMemberNumber, setNextMemberNumber] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { isAdmin } = useRole();

  // Ophalen van alle aanvragen met verbeterde validatie en foutafhandeling
  const { data: requests, isLoading } = useQuery<MemberRequest[]>({
    queryKey: ["/api/member-requests"],
    queryFn: async () => {
      console.log("Ophalen van lidmaatschapsaanvragen gestart...");
      const response = await fetch('/api/member-requests');
      
      if (!response.ok) {
        console.error("API fout bij ophalen aanvragen:", response.status, response.statusText);
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Uitgebreide logging voor betere diagnostiek
      console.log(`API response data: ${data.length} items ontvangen`);
      
      // Validatie van de ontvangen data
      if (!Array.isArray(data)) {
        console.error("Ongeldig API antwoord formaat, verwacht array:", data);
        throw new Error("Ongeldig API antwoord formaat, verwacht array");
      }
      
      // Data naverwerking en validatie per item
      const validatedData = data.map(item => {
        // Zorg dat status altijd een geldige waarde heeft
        if (!item.status || !["pending", "approved", "rejected"].includes(item.status)) {
          console.warn(`Aanvraag ${item.id} heeft ongeldige status: ${item.status}, standaard op "pending" gezet`);
          item.status = "pending";
        }
        
        // Controleer en normaliseer andere essentiële velden
        if (item.status === "approved" && !item.processedDate) {
          console.warn(`Goedgekeurde aanvraag ${item.id} mist processedDate`);
          item.processedDate = item.processedDate || new Date().toISOString();
        }
        
        if (item.status === "rejected" && !item.processedDate) {
          console.warn(`Afgewezen aanvraag ${item.id} mist processedDate`);
          item.processedDate = item.processedDate || new Date().toISOString();
        }
        
        return item;
      });
      
      // Voeg extra diagnostische logging toe
      console.log("Aanvragen per status:", {
        "pending": validatedData.filter(r => r.status === "pending").length,
        "approved": validatedData.filter(r => r.status === "approved").length,
        "rejected": validatedData.filter(r => r.status === "rejected").length
      });
      
      return validatedData;
    },
    staleTime: 30000, // 30 seconden cache
    refetchOnWindowFocus: true, // Ververs bij focus van browser venster
  });

  // Goedkeuren van een aanvraag
  const approveMutation = useMutation({
    mutationFn: async (request: MemberRequest) => {
      console.log("Goedkeuren van aanvraag met ID:", request.id);
      
      // Controleer of de aanvraag niet al is goedgekeurd
      if (request.status === "approved" || request.processedDate || request.memberNumber) {
        console.warn("Aanvraag lijkt al verwerkt te zijn:", {
          status: request.status,
          processedDate: request.processedDate,
          memberNumber: request.memberNumber
        });
      }
      
      try {
        // Vereenvoudigde aanroep - alleen essentiële gegevens sturen
        const response = await apiRequest("POST", `/api/member-requests/approve?id=${request.id}`, {
          id: request.id,
          processedBy: 1, // TODO: vervangen door echte gebruikers-ID
        });
        
        // Controleer server response
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server fout bij goedkeuren:", response.status, errorText);
          throw new Error(`Server fout: ${response.status} ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log("Goedkeuring API response:", responseData);
        
        // Extra validatie van response data
        if (!responseData.memberId || !responseData.memberNumber) {
          console.error("Onvolledige response data:", responseData);
          throw new Error("Onvolledige response data van server");
        }
        
        return responseData;
      } catch (error) {
        console.error("Fout bij goedkeuren aanvraag:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Bij goedkeuring ontvangen we memberId en memberNumber
      if (selectedRequest && data.memberId && data.memberNumber) {
        console.log(`Aanvraag #${selectedRequest.id} is goedgekeurd. Nieuw lid #${data.memberNumber} aangemaakt.`);
        
        // Handmatig de cache bijwerken om te garanderen dat de status correct is
        const currentData = queryClient.getQueryData<MemberRequest[]>(["/api/member-requests"]);
        
        if (currentData) {
          const updatedData = currentData.map(req => {
            if (req.id === selectedRequest.id) {
              console.log(`Aanvraag #${req.id} status bijwerken naar approved`);
              return {
                ...req,
                status: "approved",
                processedDate: new Date().toISOString(),
                processedBy: 1,
                memberId: data.memberId,
                memberNumber: data.memberNumber
              };
            }
            return req;
          });
          
          // Update de cache direct
          queryClient.setQueryData(["/api/member-requests"], updatedData);
        }
        
        // Invalideer de queries om achtergrond verversing te triggeren
        queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/members"] });
        
        // Wacht tot beide queries zijn ververst
        Promise.all([
          queryClient.refetchQueries({ queryKey: ["/api/member-requests"] }),
          queryClient.refetchQueries({ queryKey: ["/api/members"] })
        ])
        .then(() => {
          console.log("Alle data succesvol ververst na goedkeuring");
          
          // Extra check om te zien of de aanvraag correct is bijgewerkt
          const refreshedData = queryClient.getQueryData<MemberRequest[]>(["/api/member-requests"]);
          if (refreshedData) {
            const approvedRequest = refreshedData.find(r => r.id === selectedRequest.id);
            console.log("Status na verversing:", approvedRequest?.status);
          }
        })
        .catch((error) => {
          console.error("Fout bij het verversen van data na goedkeuring:", error);
        });
      } else {
        console.warn("Onvolledige data ontvangen na goedkeuring:", data);
      }
      
      toast({
        title: "Aanvraag goedgekeurd",
        description: `De aanvraag is succesvol goedgekeurd. Lidnummer: ${data.memberNumber}.`,
        variant: "success",
      });
      setSelectedRequest(null);
      setShowApprovalDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij goedkeuren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Afwijzen van een aanvraag
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await apiRequest("PUT", `/api/member-requests/status?id=${id}`, {
        status: "rejected",
        processedBy: 1, // TODO: vervangen door echte gebruikers-ID
        notes: reason,
        rejectionReason: reason // Toevoegen van beide parameters voor compatibiliteit
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Bij afwijzing ontvangen we de bijgewerkte aanvraag status
      if (selectedRequest) {
        console.log("Afwijzing succesvol verwerkt voor aanvraag ID:", selectedRequest.id);
        
        // Invalideer eerst de query
        queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
        
        // Wacht tot de query is ververst
        queryClient.refetchQueries({ queryKey: ["/api/member-requests"] })
          .then(() => {
            console.log("Alle aanvragen zijn ververst na afwijzing");
            
            // Controleer of de aanvraag correct is bijgewerkt
            const refetchedData = queryClient.getQueryData(["/api/member-requests"]) as MemberRequest[] | undefined;
            
            if (refetchedData) {
              const updatedRequest = refetchedData.find(req => req.id === selectedRequest.id);
              if (updatedRequest) {
                console.log("Bijgewerkte aanvraag status:", updatedRequest.status);
                
                if (updatedRequest.status !== "rejected") {
                  console.warn("Aanvraag status is niet bijgewerkt naar 'rejected'");
                }
              } else {
                console.warn("Kon de bijgewerkte aanvraag niet vinden in de data");
              }
            }
          })
          .catch((error) => {
            console.error("Fout bij het verversen van data na afwijzing:", error);
          });
      } else {
        console.warn("Geen geselecteerde aanvraag gevonden bij afwijzing");
      }
      
      toast({
        title: "Aanvraag afgewezen",
        description: "De aanvraag is succesvol afgewezen.",
        variant: "destructive",
      });
      setSelectedRequest(null);
      setShowRejectionDialog(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij afwijzen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verwijderen van een aanvraag
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/member-requests?id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      toast({
        title: "Aanvraag verwijderd",
        description: "De aanvraag is succesvol verwijderd.",
        variant: "success",
      });
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Bijwerken van een aanvraag
  const updateMutation = useMutation({
    mutationFn: async (request: Partial<EditableMemberRequest>) => {
      if (!request.id) {
        throw new Error("ID is vereist voor het bijwerken van een aanvraag");
      }
      const response = await apiRequest("PUT", `/api/member-requests?id=${request.id}`, request as MemberRequest);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      toast({
        title: "Aanvraag bijgewerkt",
        description: "De aanvraag is succesvol bijgewerkt.",
        variant: "success",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functies voor aanvragen
  // Functie om dubbele aanvragen te verwijderen op basis van naam en datum
  function removeDuplicates(requests: MemberRequest[]): MemberRequest[] {
    const seen = new Map<string, MemberRequest>();
    
    // Elke aanvraag verwerken
    for (const req of requests) {
      // Maak een unieke sleutel op basis van naam en datum
      const key = `${req.firstName}_${req.lastName}_${req.requestDate}`;
      
      // Als we al een aanvraag met deze sleutel hebben gezien, houd dan alleen de meest recente 
      // (op basis van ID - hogere ID is nieuwer)
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        if (req.id > existing.id) {
          seen.set(key, req);
        }
      } else {
        seen.set(key, req);
      }
    }
    
    // Converteer terug naar array
    return Array.from(seen.values());
  }
  
  // Haal eerst alle pending aanvragen op met strikte filtering
  const allPendingRequests = requests?.filter(req => {
    // Controleer expliciet of status exact "pending" is, niet null, undefined of iets anders
    if (req.status !== "pending") return false;
    
    // Extra controle om te zorgen dat verwerkte aanvragen (met processedDate) niet in pending terechtkomen
    if (req.processedDate) return false;
    
    // Extra controle om er zeker van te zijn dat aanvragen met memberNumber niet in pending terechtkomen
    if (req.memberNumber) return false;
    
    return true;
  }) || [];
  
  // Verwijder dan dubbele aanvragen
  const pendingRequests = removeDuplicates(allPendingRequests);
  
  // Filter verwerkte aanvragen op datum (alleen van de afgelopen 7 dagen)
  const processedRequests = requests?.filter(req => {
    // Alleen aanvragen met status "approved" of "rejected"
    if (req.status !== "approved" && req.status !== "rejected") return false;
    
    // Extra controle: aanvragen met processedDate zijn verwerkt
    if (!req.processedDate) return false;
    
    // Check of aanvraag niet ouder is dan 7 dagen
    const requestDate = new Date(req.processedDate);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return requestDate >= sevenDaysAgo;
  }) || [];
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy", { locale: nl });
  };
  
  // Functie om leeftijd te berekenen op basis van geboortedatum
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Ophalen van het eerstvolgende beschikbare lidnummer
  const { data: generatedNumber, refetch: refetchMemberNumber } = useQuery<{ memberNumber: string }>({
    queryKey: ["/api/members/generate-number"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: false, // We roepen deze query handmatig aan
    staleTime: 0, // Altijd opnieuw ophalen
    gcTime: 0  // Niet cachen (in TanStack Query v5 is cacheTime hernoemd naar gcTime)
  });

  const handleApprove = async (request: MemberRequest) => {
    setSelectedRequest(request);
    
    try {
      console.log("Ophalen lidnummer gestart voor aanvraag ID:", request.id);
      
      // Het volgende beschikbare lidnummer ophalen via de refetch functie
      const result = await refetchMemberNumber();
      
      // Type casting om TypeScript tevreden te stellen
      const memberData = result.data as { memberNumber: string } | undefined;
      
      if (memberData && memberData.memberNumber) {
        setNextMemberNumber(memberData.memberNumber);
        console.log("Lidnummer ingesteld op:", memberData.memberNumber);
      } else {
        console.error('Ontvangen lidnummer data heeft geen memberNumber:', memberData);
        throw new Error('Ongeldig formaat lidnummer ontvangen');
      }
    } catch (error) {
      console.error('Fout bij het ophalen van lidnummer:', error);
      toast({
        title: "Waarschuwing",
        description: "Kon geen lidnummer ophalen. Ga toch door met goedkeuring.",
        variant: "destructive",
      });
    }
    
    setShowApprovalDialog(true);
  };

  const handleReject = (request: MemberRequest) => {
    setSelectedRequest(request);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (selectedRequest) {
      // Stuur de hele aanvraag door in plaats van alleen het ID
      approveMutation.mutate(selectedRequest);
    }
  };

  const confirmRejection = () => {
    if (selectedRequest) {
      // Controleer of er een afwijzingsreden is ingevuld
      if (!rejectionReason.trim()) {
        toast({
          title: "Reden verplicht",
          description: "Geef een reden op voor de afwijzing.",
          variant: "destructive",
        });
        return;
      }
      
      rejectMutation.mutate({
        id: selectedRequest.id,
        reason: rejectionReason
      });
    }
  };

  const handleDelete = (request: MemberRequest) => {
    if (window.confirm("Weet je zeker dat je deze aanvraag wilt verwijderen?")) {
      deleteMutation.mutate(request.id);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500 text-white border-amber-600 shadow-sm px-2 py-0.5 min-w-[120px] text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <Clock className="h-3 w-3" />
              <span>In behandeling</span>
            </div>
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-600 text-white border-green-700 shadow-sm px-2 py-0.5 min-w-[120px] text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <CheckIcon className="h-3 w-3" />
              <span>Goedgekeurd</span>
            </div>
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-600 text-white border-red-700 shadow-sm px-2 py-0.5 min-w-[120px] text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <XIcon className="h-3 w-3" />
              <span>Afgewezen</span>
            </div>
          </Badge>
        );
      default:
        return <Badge variant="outline">Onbekend</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col justify-start items-start bg-primary/90 text-white p-6 rounded-lg mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Aanvragen</h1>
        <p className="mt-1 opacity-90">Beheer nieuwe aanvragen en bekijk verwerkte aanvragen</p>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex gap-2">
          <Button 
            onClick={() => window.open('/register-request', '_blank')}
            variant="outline"
            className="flex items-center gap-2 border-[#963E56] text-[#963E56] hover:bg-[#963E56]/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
            Aanmeldformulier
          </Button>
        </div>
      </div>

      <div className="stats grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white border shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3.8a2 2 0 0 0 1.4-.6L12 4.6a2 2 0 0 1 1.4-.6H20a2 2 0 0 1 2 2v1.8c0 .26-.1.51-.2.72" />
              </svg>
              Totaal aanvragen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{requests?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              In behandeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{pendingRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Verwerkt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{processedRequests.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="bg-white p-4 rounded-md border shadow-sm">
        <TabsList className="mb-6 grid w-full grid-cols-2 bg-gray-100 p-1 rounded-md">
          <TabsTrigger value="pending" className="rounded-md data-[state=active]:bg-white">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              In behandeling ({pendingRequests.length})
            </div>
          </TabsTrigger>
          <TabsTrigger value="processed" className="rounded-md data-[state=active]:bg-white">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Verwerkt ({processedRequests.length})
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          <div className="rounded-md border">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] text-left font-semibold">Naam</TableHead>
                  <TableHead className="w-[120px] text-left font-semibold">Datum</TableHead>
                  <TableHead className="text-center w-[120px] font-semibold">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Geen aanvragen in behandeling
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium text-left">
                        <div className="flex items-center gap-2">
                          {request.firstName} {request.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        {formatDate(request.requestDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Bekijken</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(request)}
                          >
                            <CheckIcon className="h-4 w-4" />
                            <span className="sr-only">Goedkeuren</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(request)}
                          >
                            <XIcon className="h-4 w-4" />
                            <span className="sr-only">Afwijzen</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="processed" className="space-y-4">
          <div className="rounded-md border">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] text-left font-semibold">Naam</TableHead>
                  <TableHead className="w-[120px] text-center font-semibold">Status</TableHead>
                  <TableHead className="w-[120px] text-left font-semibold">Verwerkt op</TableHead>
                  <TableHead className="text-center w-[120px] font-semibold">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Geen verwerkte aanvragen in de afgelopen 7 dagen
                    </TableCell>
                  </TableRow>
                ) : (
                  processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium text-left">
                        <div className="flex items-center gap-2">
                          {request.firstName} {request.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {request.status === "approved" && (
                          <Badge variant="outline" className="bg-green-600 text-white border-green-700 shadow-sm px-2 py-0.5 min-w-[120px] text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <CheckIcon className="h-3 w-3" />
                              <span>Goedgekeurd</span>
                            </div>
                          </Badge>
                        )}
                        {request.status === "rejected" && (
                          <Badge variant="outline" className="bg-red-600 text-white border-red-700 shadow-sm px-2 py-0.5 min-w-[120px] text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <XIcon className="h-3 w-3" />
                              <span>Afgewezen</span>
                            </div>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        {formatDate(request.processedDate || request.requestDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Bekijken</span>
                          </Button>
                          {isAdmin && request.status === "rejected" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(request)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Verwijderen</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog 
        open={showDetailDialog} 
        onOpenChange={(isOpen) => {
          if (isOpen && selectedRequest) {
            console.log("DetailDialog geopend met:", selectedRequest);
            console.log("Status:", selectedRequest.status);
            console.log("memberNumber:", selectedRequest.memberNumber);
            console.log("memberId:", selectedRequest.memberId);
          }
          setShowDetailDialog(isOpen);
        }}>
        <DialogContent className="w-full max-w-xl" hideCloseButton>
          <DialogHeader className="bg-gradient-to-r from-[#963E56] to-[#83354A] p-5 sm:p-6 text-white rounded-t-xl -mt-4 -mx-4 shadow-md">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold text-white">
                {selectedRequest?.firstName} {selectedRequest?.lastName}
              </DialogTitle>
              <div>
                {selectedRequest?.status === "pending" && (
                  <Badge variant="outline" className="bg-amber-500 text-white border-amber-600 shadow-sm px-3 py-1 min-w-[130px] text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Clock className="h-3.5 w-3.5" />
                      <span>In behandeling</span>
                    </div>
                  </Badge>
                )}
                {selectedRequest?.status === "approved" && (
                  <Badge variant="outline" className="bg-green-600 text-white border-green-700 shadow-sm px-3 py-1 min-w-[130px] text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <CheckIcon className="h-3.5 w-3.5" />
                      <span>Goedgekeurd</span>
                    </div>
                  </Badge>
                )}
                {selectedRequest?.status === "rejected" && (
                  <Badge variant="outline" className="bg-red-600 text-white border-red-700 shadow-sm px-3 py-1 min-w-[130px] text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <XIcon className="h-3.5 w-3.5" />
                      <span>Afgewezen</span>
                    </div>
                  </Badge>
                )}
              </div>
            </div>
            <DialogDescription className="text-white/90 mt-1">
              Aanvraag ingediend op {selectedRequest && formatDate(selectedRequest.requestDate)}
              {selectedRequest?.status === "approved" && selectedRequest?.memberNumber && (
                <div className="mt-2 flex items-center">
                  <span className="bg-white/20 text-white px-2 py-1 rounded text-sm font-medium mr-2">Lidnummer:</span>
                  <button 
                    onClick={() => setLocation(`/member-detail?id=${selectedRequest.memberId}`)}
                    className="bg-white/30 hover:bg-white/40 transition-colors text-white px-2 py-1 rounded text-sm font-semibold flex items-center"
                  >
                    {selectedRequest.memberNumber}
                    <ArrowLeft className="ml-1 h-3.5 w-3.5 -rotate-45" />
                  </button>
                </div>
              )}

            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(100vh-280px)] pr-2 mt-4">
            {/* Afwijzingsreden tonen indien afgewezen */}
            {selectedRequest?.status === "rejected" && (
              <div className="mb-6">
                <h3 className="text-[#963E56] font-semibold text-lg border-b border-[#963E56]/20 pb-2 mb-3 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-[#963E56]/70" />
                  Reden voor afwijzing
                </h3>
                
                <div className="bg-red-50 p-4 rounded-md border border-red-200 shadow-sm">
                  <p className="text-gray-800">{selectedRequest.rejectionReason || selectedRequest.notes || "Geen reden opgegeven"}</p>
                </div>
              </div>
            )}
            
            {/* Persoonlijke gegevens sectie */}
            <div className="mb-6">
              <h3 className="text-[#963E56] font-semibold text-lg border-b border-[#963E56]/20 pb-2 mb-3 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-[#963E56]/70" />
                Persoonlijke gegevens
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-md border border-[#963E56]/20 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-pattern opacity-5"></div>
                  <h4 className="font-semibold text-gray-800 mb-3 relative z-10">{selectedRequest?.firstName} {selectedRequest?.lastName}</h4>
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Geslacht:</span>
                      <span className="font-medium">
                        {selectedRequest?.gender === "man" ? "Man" : 
                         selectedRequest?.gender === "vrouw" ? "Vrouw" : ""}
                      </span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Geboortedatum:</span>
                      <span className="font-medium">
                        {selectedRequest?.birthDate ? formatDate(selectedRequest.birthDate) : ""}
                      </span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Leeftijd:</span>
                      <span className="font-medium">
                        {selectedRequest?.birthDate ? calculateAge(new Date(selectedRequest.birthDate)) : ""} jaar
                      </span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Nationaliteit:</span>
                      <span className="font-medium">{selectedRequest?.nationality || "-"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-[#963E56]/20 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-pattern opacity-5"></div>
                  <h4 className="font-semibold text-gray-800 mb-3 relative z-10">Adresgegevens</h4>
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Straat + nr:</span>
                      <span className="font-medium">
                        {selectedRequest?.street} {selectedRequest?.houseNumber}
                        {selectedRequest?.busNumber && `, bus ${selectedRequest.busNumber}`}
                      </span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Postcode:</span>
                      <span className="font-medium">{selectedRequest?.postalCode || "-"}</span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Gemeente:</span>
                      <span className="font-medium">{selectedRequest?.city || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contactgegevens sectie */}
            <div className="mb-6">
              <h3 className="text-[#963E56] font-semibold text-lg border-b border-[#963E56]/20 pb-2 mb-3 flex items-center">
                <MailIcon className="h-5 w-5 mr-2 text-[#963E56]/70" />
                Contactgegevens
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-md border border-[#963E56]/20 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-pattern opacity-5"></div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Email:</span>
                      <span className="font-medium">{selectedRequest?.email}</span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Telefoon:</span>
                      <span className="font-medium">{selectedRequest?.phoneNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Lidmaatschap sectie */}
            <div className="mb-6">
              <h3 className="text-[#963E56] font-semibold text-lg border-b border-[#963E56]/20 pb-2 mb-3 flex items-center">
                <UserPlusIcon className="h-5 w-5 mr-2 text-[#963E56]/70" />
                Lidmaatschap
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-md border border-[#963E56]/20 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-pattern opacity-5"></div>
                  <h4 className="font-semibold text-gray-800 mb-3 relative z-10">Details</h4>
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Type:</span>
                      <span className="font-medium">
                        {formatMembershipTypeLabel(selectedRequest?.membershipType)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-[#963E56]/20 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-pattern opacity-5"></div>
                  <h4 className="font-semibold text-gray-800 mb-3 relative z-10">Betalingsgegevens</h4>
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Betaalwijze:</span>
                      <span className="font-medium">
                        {formatPaymentMethodLabel(selectedRequest?.paymentMethod)}
                      </span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Betaaltermijn:</span>
                      <span className="font-medium">
                        {formatPaymentTermLabel(selectedRequest?.paymentTerm)}
                      </span>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32">Auto. verlenging:</span>
                      <span className="font-medium">
                        {formatAutoRenewLabel(selectedRequest?.autoRenew)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Bankgegevens tonen indien aanwezig of domiciliëring gekozen */}
                {(selectedRequest?.paymentMethod === "domiciliering" || selectedRequest?.accountNumber) && (
                  <div className="bg-white p-4 rounded-md border border-[#963E56]/20 shadow-sm sm:col-span-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-pattern opacity-5"></div>
                    <h4 className="font-semibold text-gray-800 mb-3 relative z-10">Bankgegevens</h4>
                    
                    <div className="space-y-2 relative z-10">
                      <div className="flex items-start">
                        <span className="text-gray-600 w-32">Rekeningnr:</span>
                        <span className="font-medium">{selectedRequest?.accountNumber || "-"}</span>
                      </div>
                      
                      <div className="flex items-start">
                        <span className="text-gray-600 w-32">Rekeninghouder:</span>
                        <span className="font-medium">{selectedRequest?.accountHolderName || "-"}</span>
                      </div>
                      
                      {selectedRequest?.bicSwift && (
                        <div className="flex items-start">
                          <span className="text-gray-600 w-32">BIC/SWIFT:</span>
                          <span className="font-medium">{selectedRequest?.bicSwift}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-end pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => setShowDetailDialog(false)}
              className="ml-auto"
            >
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Goedkeuren dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md" hideCloseButton>
          <DialogHeader className="bg-gradient-to-r from-[#963E56] to-[#7a3246] p-5 text-white rounded-t-xl -mt-4 -mx-4 shadow-md">
            <div className="flex items-center mb-1">
              <div className="bg-green-600 h-7 w-7 rounded-full flex items-center justify-center mr-2 shadow-sm">
                <CheckIcon className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-white">Aanvraag goedkeuren</DialogTitle>
            </div>
            <DialogDescription className="text-white/90 mt-1">
              Bevestig om deze aanvraag goed te keuren en een nieuw lid aan te maken.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            {nextMemberNumber && (
              <div className="mb-4 bg-gradient-to-br from-[#963E56]/10 to-[#7a3246]/10 p-4 border border-[#963E56]/20 rounded-md text-center shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-pattern opacity-5"></div>
                <p className="text-sm text-[#963E56] font-medium uppercase tracking-wide relative z-10">Nieuw lidnummer</p>
                <div className="flex items-center justify-center mt-1 relative z-10">
                  <CheckIcon className="h-5 w-5 text-[#963E56] mr-1.5" />
                  <p className="text-2xl font-bold text-[#963E56]">{nextMemberNumber}</p>
                </div>
                <p className="text-xs text-[#963E56]/80 mt-1 relative z-10">Deze aanvraag zal worden omgezet naar een lidmaatschap</p>
              </div>
            )}

            <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-lg">
                  {selectedRequest?.firstName} {selectedRequest?.lastName}
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRequest?.birthDate && (
                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-800 rounded-full px-2 py-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {calculateAge(new Date(selectedRequest.birthDate))} jaar
                    </span>
                  )}
                  
                  {selectedRequest?.city && (
                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-800 rounded-full px-2 py-1">
                      <MapPinIcon className="mr-1 h-3 w-3" />
                      {selectedRequest.city}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Type lidmaatschap</p>
                    <p className="font-medium text-gray-800">
                      {formatMembershipTypeLabel(selectedRequest?.membershipType)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Betalingsmethode</p>
                    <p className="font-medium text-gray-800">
                      {formatPaymentMethodLabel(selectedRequest?.paymentMethod)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Betalingstermijn</p>
                    <p className="font-medium text-gray-800">
                      {formatPaymentTermLabel(selectedRequest?.paymentTerm)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Automatische verlenging</p>
                    <p className="font-medium text-gray-800">
                      {formatAutoRenewLabel(selectedRequest?.autoRenew)}
                    </p>
                  </div>
                </div>
                
                {(selectedRequest?.paymentMethod === "domiciliering" || selectedRequest?.accountNumber) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Bankgegevens</p>
                    
                    {selectedRequest?.accountNumber && (
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCardIcon className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-sm">{selectedRequest.accountNumber}</p>
                      </div>
                    )}
                    
                    {selectedRequest?.accountHolderName && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-sm">{selectedRequest.accountHolderName}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4 border-t border-gray-200">
            <Button 
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              className="w-full sm:w-auto"
            >
              Annuleren
            </Button>
            <Button 
              onClick={confirmApproval}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckIcon className="mr-2 h-4 w-4" />
              )}
              Bevestig goedkeuring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Afwijzen dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md" hideCloseButton>
          <DialogHeader className="bg-gradient-to-r from-[#963E56] to-[#7a3246] p-5 text-white rounded-t-xl -mt-4 -mx-4 shadow-md">
            <div className="flex items-center mb-1">
              <div className="bg-red-600 h-7 w-7 rounded-full flex items-center justify-center mr-2 shadow-sm">
                <XIcon className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-white">Aanvraag afwijzen</DialogTitle>
            </div>
            <DialogDescription className="text-white/90 mt-1">
              Reden voor afwijzing van deze aanvraag
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-lg">
                  {selectedRequest?.firstName} {selectedRequest?.lastName}
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRequest?.birthDate && (
                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-800 rounded-full px-2 py-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {calculateAge(new Date(selectedRequest.birthDate))} jaar
                    </span>
                  )}
                  
                  {selectedRequest?.city && (
                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-800 rounded-full px-2 py-1">
                      <MapPinIcon className="mr-1 h-3 w-3" />
                      {selectedRequest.city}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Type lidmaatschap</p>
                    <p className="font-medium text-gray-800">
                      {formatMembershipTypeLabel(selectedRequest?.membershipType)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Betalingsmethode</p>
                    <p className="font-medium text-gray-800">
                      {formatPaymentMethodLabel(selectedRequest?.paymentMethod)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Betalingstermijn</p>
                    <p className="font-medium text-gray-800">
                      {formatPaymentTermLabel(selectedRequest?.paymentTerm)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Automatische verlenging</p>
                    <p className="font-medium text-gray-800">
                      {formatAutoRenewLabel(selectedRequest?.autoRenew)}
                    </p>
                  </div>
                </div>
                
                {(selectedRequest?.paymentMethod === "domiciliering" || selectedRequest?.accountNumber) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Bankgegevens</p>
                    
                    {selectedRequest?.accountNumber && (
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCardIcon className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-sm">{selectedRequest.accountNumber}</p>
                      </div>
                    )}
                    
                    {selectedRequest?.accountHolderName && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-sm">{selectedRequest.accountHolderName}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-[#963E56]/10 p-4 rounded-md border border-[#963E56]/20 mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-pattern opacity-5"></div>
            <div className="relative z-10">
              <div className="flex items-start mb-2">
                <AlertCircle className="text-[#963E56] h-5 w-5 mr-2 mt-0.5" />
                <p className="text-sm text-[#963E56]">
                  Deze actie kan niet ongedaan worden gemaakt.
                </p>
              </div>
              
              <Label htmlFor="rejection-reason" className="text-gray-700 font-medium">
                Reden voor afwijzing <span className="text-[#963E56]">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Geef een reden voor de afwijzing..."
                className="mt-1 border-[#963E56]/20 focus:border-[#963E56] focus:ring-[#963E56]/30"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectionDialog(false);
                setRejectionReason("");
              }}
              className="w-full sm:w-auto"
            >
              Annuleren
            </Button>
            <Button 
              onClick={confirmRejection}
              className="w-full sm:w-auto bg-[#963E56] hover:bg-[#7a3246] text-white shadow-sm"
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XIcon className="mr-2 h-4 w-4" />
              )}
Afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}