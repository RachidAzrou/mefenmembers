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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  CheckIcon, 
  Loader2, 
  XIcon,
  Eye,
  Clock,
  User as UserIcon,
  Calendar as CalendarIcon,
  CreditCard as CreditCardIcon,
  MapPin as MapPinIcon,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRole } from "@/hooks/use-role";

// Type voor lidmaatschapsaanvragen
interface MemberRequest {
  id: number | string;
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
  paymentMethod?: "cash" | "domiciliering" | "overschrijving" | "bancontact";
  paymentTerm?: "maandelijks" | "driemaandelijks" | "jaarlijks";
  autoRenew?: boolean;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  bicSwift?: string | null;
  rejectionReason?: string | null;
  memberId?: number | string | null;
  memberNumber?: string | null;
}

export default function MemberRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAdmin } = useRole();
  
  // UI states
  const [selectedRequest, setSelectedRequest] = useState<MemberRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Ophalen van alle lidmaatschapsaanvragen
  const { data: requests, isLoading } = useQuery<MemberRequest[]>({
    queryKey: ["/api/member-requests"],
    refetchOnWindowFocus: true, // Haal data opnieuw op bij focus
    refetchOnMount: true,       // Haal data opnieuw op bij component mount
    staleTime: 1000,            // Beschouw data als verouderd na 1 seconde
    queryFn: async () => {
      // Voorkom caching problemen met cachebuster parameter
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/member-requests?_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API fout: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error("Ongeldig API antwoord formaat: geen array");
      }
      
      // Normaliseer en valideer elk item
      return data.map(item => {
        // Maak kopie om onbedoelde referentieproblemen te vermijden
        const cleanItem = { ...item };
        
        // Valideer status veld
        if (!cleanItem.status || !["pending", "approved", "rejected"].includes(cleanItem.status)) {
          cleanItem.status = "pending";
        }
        
        return cleanItem;
      });
    }
  });

  // Detecteer aanvragen met inconsistente status (debugging)
  const inconsistentRequests = requests 
    ? requests.filter(req => {
        // Goedgekeurde aanvragen zonder verwerkingsdatum of lidnummer
        const isInconsistentApproved = req.status === "approved" && 
                                      (!req.processedDate || !req.memberId);
        // Afgewezen aanvragen zonder verwerkingsdatum
        const isInconsistentRejected = req.status === "rejected" && !req.processedDate;
        // Pending aanvragen met verwerkingsdatum
        const isInconsistentPending = req.status === "pending" && req.processedDate !== null;
        
        return isInconsistentApproved || isInconsistentRejected || isInconsistentPending;
      })
    : [];
  
  // Log eventuele inconsistente aanvragen voor debugging
  if (inconsistentRequests.length > 0) {
    console.warn(`Gevonden ${inconsistentRequests.length} aanvragen met inconsistente status:`, 
    inconsistentRequests.map(r => ({
      id: r.id, 
      status: r.status,
      processedDate: r.processedDate,
      memberId: r.memberId
    })));
  }

  // Filter aanvragen voor "In behandeling" lijst - STRIKTE DEFINITIE
  const pendingRequests = requests
    ? requests.filter(req => {
        // DEFINITIE: Een aanvraag is in behandeling ALLEEN als:
        // 1. De status expliciet "pending" is
        // 2. Er geen verwerkingsdatum is
        // 3. Er geen memberId is (extra check)
        return req.status === "pending" && !req.processedDate && !req.memberId;
      })
    : [];

  // Filter aanvragen voor "Verwerkt" lijst - STRIKTE DEFINITIE
  const processedRequests = requests
    ? requests.filter(req => {
        // DEFINITIE: Een aanvraag is verwerkt ALLEEN als:
        // 1. De status "approved" of "rejected" is
        // 2. Er een verwerkingsdatum is 
        // 3. Als "approved": er moet ook een memberId zijn
        const hasCorrectStatus = req.status === "approved" || req.status === "rejected";
        const hasProcessedDate = req.processedDate !== null;
        const hasMemberIdIfRequired = req.status !== "approved" || (req.status === "approved" && req.memberId);
        
        return hasCorrectStatus && hasProcessedDate && hasMemberIdIfRequired;
      })
    : [];
    
  // Helper functie om de lokale React Query cache direct te updaten
  // Dit zorgt ervoor dat de UI meteen reageert zonder de server te moeten wachten
  const updateQueryCacheForApproval = (request: MemberRequest, requestId: number | string) => {
    try {
      // Update de request lokaal zodat het meteen uit de "In behandeling" lijst verdwijnt
      const currentRequests = queryClient.getQueryData<MemberRequest[]>(["/api/member-requests"]);
      
      if (currentRequests) {
        // Maak een kopie van het verzoek en markeer als goedgekeurd
        // Zorg ervoor dat we een dummy memberId toevoegen om filterproblemen te voorkomen
        const updatedRequest: MemberRequest = {
          ...request,
          status: "approved",
          processedDate: new Date().toISOString(),
          processedBy: 1,
          memberId: request.memberId || -1,  // Tijdelijke waarde die later wordt overschreven door de server
          memberNumber: request.memberNumber || "temp"  // Tijdelijke waarde voor betere UI weergave
        };
        
        // Vervang de oude versie met de bijgewerkte versie
        const updatedRequests = currentRequests.map(req => 
          String(req.id) === String(requestId) ? updatedRequest : req
        );
        
        // Update de cache direct
        queryClient.setQueryData<MemberRequest[]>(["/api/member-requests"], updatedRequests);
        console.log("Query cache direct bijgewerkt, aanvraag gemarkeerd als goedgekeurd");
      }
    } catch (error) {
      console.error("Fout bij direct bijwerken van de query cache:", error);
      // Geen throw hier, omdat dit een optimalisatie is en geen kritieke functie
    }
  };

  // Functies voor het formatteren van de datum
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy", { locale: nl });
  };
  
  // Helper functies voor formatteren van lidmaatschapsgegevens
  const formatMembershipTypeLabel = (type: string | null | undefined) => {
    if (!type) return "Onbekend";
    switch (type) {
      case "standaard": return "Standaard";
      case "student": return "Student";
      case "senior": return "Senior";
      default: return type;
    }
  };
  
  const formatPaymentMethodLabel = (method: string | null | undefined) => {
    if (!method) return "Onbekend";
    switch (method) {
      case "cash": return "Contant";
      case "domiciliering": return "Domiciliëring";
      case "overschrijving": return "Overschrijving";
      case "bancontact": return "Bancontact";
      default: return method;
    }
  };
  
  const formatPaymentTermLabel = (term: string | null | undefined) => {
    if (!term) return "Onbekend";
    switch (term) {
      case "maandelijks": return "Maandelijks";
      case "driemaandelijks": return "Driemaandelijks";
      case "jaarlijks": return "Jaarlijks";
      default: return term;
    }
  };
  
  const formatAutoRenewLabel = (autoRenew: boolean | null | undefined) => {
    return autoRenew ? "Ja" : "Nee";
  };

  // Goedkeuren van een aanvraag
  const approveMutation = useMutation({
    mutationFn: async (requestId: number | string) => {
      // Vind de volledige aanvraag gegevens om mee te sturen
      const currentRequests = queryClient.getQueryData<MemberRequest[]>(["/api/member-requests"]);
      const requestData = currentRequests?.find(req => String(req.id) === String(requestId));
      
      if (!requestData) {
        throw new Error("Aanvraaggegevens niet gevonden in cache");
      }
      
      console.log("Volledige aanvraaggegevens voor goedkeuring:", requestData);
      
      // DIRECT DE LOKALE CACHE UPDATEN om een naadloze gebruikerservaring te bieden
      // Hiermee verdwijnt de aanvraag direct uit de "In behandeling" lijst in de UI, zelfs als de server langzaam is
      updateQueryCacheForApproval(requestData, requestId);
      
      // Log voor debug doeleinden
      console.log("Gegevens die naar de server worden gestuurd:", {
        url: `/api/member-requests/approve?id=${requestId}`,
        data: {
          ...requestData,
          id: requestId,
          processedBy: 1
        }
      });
      
      // Stuur alle benodigde gegevens mee
      const response = await apiRequest("POST", `/api/member-requests/approve?id=${requestId}`, {
        ...requestData,  // Stuur alle data mee
        id: requestId,   // Zorg ervoor dat ID niet overschreven wordt
        processedBy: 1   // Standaard beheerder ID
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Server response na goedkeuring:", data);
      
      // Haal lidnummer en lidID uit response
      const memberNumber = data.memberNumber || data.member?.memberNumber;
      const memberId = data.memberId || data.member?.id;
      
      // KRITIEKE CONTROLE: Gaan na of er daadwerkelijk een memberNumber en memberId zijn toegewezen
      if (!memberNumber || !memberId) {
        console.error("Waarschuwing: Goedkeuring response mist memberId of memberNumber", { data });
        
        // Toon een waarschuwing, maar laat de gebruiker weten dat er mogelijk een probleem is
        toast({
          title: "Deels geslaagd",
          description: "De aanvraag is gemarkeerd als goedgekeurd, maar er kon geen lidnummer worden toegewezen. Dit kan een tijdelijk probleem zijn. Ververs de pagina en controleer of de aanvraag correct is verwerkt.",
          variant: "destructive"
        });
        
        // Ververs data om de huidige status te zien
        queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/members"] });
        
        // Reset UI state
        setSelectedRequest(null);
        setShowApprovalDialog(false);
        return;
      }
      
      // Als alles goed is gegaan, toon succesmelding
      toast({
        title: "Aanvraag goedgekeurd",
        description: `De aanvraag is succesvol goedgekeurd. Lidnummer: ${memberNumber}.`,
        variant: "success",
      });
      
      // Ververs data
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      
      // Reset UI state
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
    mutationFn: async ({ id, reason }: { id: number | string; reason: string }) => {
      // Vind de volledige aanvraag gegevens om mee te sturen
      const currentRequests = queryClient.getQueryData<MemberRequest[]>(["/api/member-requests"]);
      const requestData = currentRequests?.find(req => String(req.id) === String(id));
      
      if (!requestData) {
        throw new Error("Aanvraaggegevens niet gevonden in cache");
      }
      
      console.log("Volledige aanvraaggegevens voor afwijzing:", requestData);
      
      // Stuur de volledige data mee met de afwijzingsreden
      const response = await apiRequest("PUT", `/api/member-requests/status?id=${id}`, {
        ...requestData,
        id: id,
        status: "rejected",
        notes: reason,
        rejectionReason: reason,
        processedBy: 1,
        processedDate: new Date().toISOString()
      });
      
      return await response.json();
    },
    onSuccess: () => {
      // Toon succesmelding
      toast({
        title: "Aanvraag afgewezen",
        description: "De aanvraag is succesvol afgewezen.",
        variant: "destructive",
      });
      
      // Ververs data
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      
      // Reset UI state
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

  // Aanvraag details bekijken
  const handleViewDetails = (request: MemberRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  // Aanvraag goedkeuren
  const handleApprove = (request: MemberRequest) => {
    setSelectedRequest(request);
    setShowApprovalDialog(true);
  };

  // Aanvraag afwijzen
  const handleReject = (request: MemberRequest) => {
    setSelectedRequest(request);
    setShowRejectionDialog(true);
  };

  // Goedkeuring bevestigen
  const confirmApproval = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  // Afwijzing bevestigen
  const confirmRejection = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate({
        id: selectedRequest.id,
        reason: rejectionReason
      });
    } else {
      toast({
        title: "Reden verplicht",
        description: "Geef een reden op voor de afwijzing.",
        variant: "destructive",
      });
    }
  };

  // Status badges
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

  // Laadstatus weergeven
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <TabsList className="mb-6 grid w-full grid-cols-3 bg-gray-100 p-1 rounded-md">
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
          {inconsistentRequests.length > 0 && (
          <TabsTrigger value="inconsistent" className="rounded-md data-[state=active]:bg-white">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Problemen ({inconsistentRequests.length})
            </div>
          </TabsTrigger>
          )}
        </TabsList>
        
        {/* In behandeling tab */}
        <TabsContent value="pending" className="space-y-4">
          <div className="rounded-md border">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] text-left font-semibold">Naam</TableHead>
                  <TableHead className="w-[80px] text-left font-semibold">Datum</TableHead>
                  <TableHead className="w-[80px] text-left font-semibold">Aanvraag ID</TableHead>
                  <TableHead className="w-[120px] text-left font-semibold">Eerdere aanvragen</TableHead>
                  <TableHead className="text-center w-[120px] font-semibold">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Geen aanvragen in behandeling
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((request) => {
                    // Controleer of deze persoon meerdere aanvragen heeft
                    const allRequestsFromSamePerson = requests?.filter(req => 
                      req.firstName === request.firstName && 
                      req.lastName === request.lastName && 
                      req.id !== request.id
                    ) || [];
                    
                    // Sorteer de eerdere aanvragen van nieuw naar oud
                    const previousRequests = allRequestsFromSamePerson
                      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
                    
                    const hasMultipleRequests = previousRequests.length > 0;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium text-left">
                          <div className="flex items-center gap-2">
                            {request.firstName} {request.lastName}
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          {formatDate(request.requestDate)}
                        </TableCell>
                        <TableCell className="text-left">
                          #{request.id}
                        </TableCell>
                        <TableCell className="text-left">
                          {hasMultipleRequests ? (
                            <div className="flex items-center">
                              <span className="text-amber-600 font-medium text-sm flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="12"></line>
                                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                {previousRequests.length} eerdere 
                                {previousRequests.some(r => r.status === "approved") && 
                                  <span className="text-green-600 font-medium"> (Lid!)</span>
                                }
                              </span>
                            </div>
                          ) : "Eerste aanvraag"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewDetails(request)}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Verwerkt tab */}
        <TabsContent value="processed" className="space-y-4">
          <div className="rounded-md border">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] text-left font-semibold">Naam</TableHead>
                  <TableHead className="w-[80px] text-center font-semibold">Status</TableHead>
                  <TableHead className="w-[80px] text-left font-semibold">Aanvraag ID</TableHead>
                  <TableHead className="w-[80px] text-left font-semibold">Verwerkt op</TableHead>
                  <TableHead className="w-[120px] text-left font-semibold">Andere aanvragen</TableHead>
                  <TableHead className="text-center w-[100px] font-semibold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Geen verwerkte aanvragen
                    </TableCell>
                  </TableRow>
                ) : (
                  processedRequests.map((request) => {
                    // Controleer of deze persoon meerdere aanvragen heeft
                    const otherRequestsFromSamePerson = requests?.filter(req => 
                      req.firstName === request.firstName && 
                      req.lastName === request.lastName && 
                      req.id !== request.id
                    ) || [];
                    
                    // Sorteer de overige aanvragen van nieuw naar oud
                    const otherRequests = otherRequestsFromSamePerson
                      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
                    
                    const hasMembershipApproved = request.status === "approved" && request.memberId;
                    const hasMultipleRequests = otherRequests.length > 0;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium text-left">
                          <div className="flex items-center gap-2">
                            {request.firstName} {request.lastName}
                            {hasMembershipApproved && 
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                Lid #{request.memberNumber}
                              </span>
                            }
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell className="text-left">
                          #{request.id}
                        </TableCell>
                        <TableCell className="text-left">
                          {formatDate(request.processedDate)}
                        </TableCell>
                        <TableCell className="text-left">
                          {hasMultipleRequests ? (
                            <div className="flex items-center">
                              <span className="text-gray-600 text-sm flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="9" cy="7" r="4"></circle>
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                {otherRequests.length} andere
                                {otherRequests.some(r => r.status === "pending") &&
                                  <span className="text-amber-600 font-medium"> (In behandeling)</span>
                                }
                              </span>
                            </div>
                          ) : "Enige aanvraag"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(request)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Bekijken</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab voor inconsistente aanvragen met problemen */}
        {inconsistentRequests.length > 0 && (
        <TabsContent value="inconsistent" className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <h3 className="text-red-700 font-medium mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Aanvragen met inconsistente status
            </h3>
            <p className="text-red-700 text-sm">
              De volgende aanvragen hebben een inconsistente status die handmatige correctie behoeven.
              Dit kan gebeuren als er een fout optreedt tijdens het verwerken van een aanvraag.
              U kunt de status resetten naar "In behandeling" om ze opnieuw te verwerken.
            </p>
          </div>
        
          <div className="rounded-md border">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] text-left font-semibold">Naam</TableHead>
                  <TableHead className="w-[100px] text-center font-semibold">Status</TableHead>
                  <TableHead className="w-[120px] text-left font-semibold">Datum</TableHead>
                  <TableHead className="w-[120px] text-left font-semibold">Probleem</TableHead>
                  <TableHead className="text-center w-[180px] font-semibold">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inconsistentRequests.map((request) => {
                  // Bepaal wat het probleem is
                  let probleem = "";
                  if (request.status === "approved" && !request.memberId) {
                    probleem = "Goedgekeurd zonder lidnummer";
                  } else if (request.status === "approved" && !request.processedDate) {
                    probleem = "Goedgekeurd zonder verwerkingsdatum";
                  } else if (request.status === "rejected" && !request.processedDate) {
                    probleem = "Afgewezen zonder verwerkingsdatum";
                  } else if (request.status === "pending" && request.processedDate) {
                    probleem = "In behandeling maar wel verwerkingsdatum";
                  } else {
                    probleem = "Onbekend probleem";
                  }
                  
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium text-left">
                        <div className="flex items-center gap-2">
                          {request.firstName} {request.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-left">
                        {formatDate(request.requestDate)}
                      </TableCell>
                      <TableCell className="text-left text-red-600 font-medium">
                        {probleem}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(request)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Bekijken</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-sm h-8"
                            onClick={() => {
                              // TODO: Implementeer reset functionaliteit
                              toast({
                                title: "Functionaliteit in ontwikkeling",
                                description: "Het resetten van aanvragen zal in een toekomstige update beschikbaar zijn.",
                                variant: "destructive"
                              });
                            }}
                          >
                            Reset naar 'Pending'
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        )}
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aanvraag details</DialogTitle>
            <DialogDescription>
              Details van de lidmaatschapsaanvraag
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Informatie over aanvraag ID */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p><span className="font-semibold">Aanvraag ID:</span> #{selectedRequest.id}</p>
                
                {/* Controleer of deze persoon andere aanvragen heeft */}
                {(() => {
                  const otherRequests = requests?.filter(req => 
                    req.firstName === selectedRequest.firstName && 
                    req.lastName === selectedRequest.lastName && 
                    req.id !== selectedRequest.id
                  ) || [];
                  
                  if (otherRequests.length > 0) {
                    // Check of er al een goedgekeurde aanvraag is
                    const approvedRequest = otherRequests.find(r => r.status === "approved" && r.memberId);
                    
                    return (
                      <div className="mt-2">
                        <p className="text-amber-600 font-medium flex items-center gap-1 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          Deze persoon heeft {otherRequests.length} andere aanvra{otherRequests.length === 1 ? 'ag' : 'gen'}
                        </p>
                        {approvedRequest && (
                          <p className="text-green-600 font-medium text-sm mt-1">
                            ⚠️ Al lid sinds {formatDate(approvedRequest.processedDate)} (Lidnummer: {approvedRequest.memberNumber})
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            
              <div>
                <h3 className="font-semibold mb-1">Persoonlijke informatie</h3>
                <p><span className="font-semibold">Naam:</span> {selectedRequest.firstName} {selectedRequest.lastName}</p>
                <p><span className="font-semibold">E-mail:</span> {selectedRequest.email}</p>
                <p><span className="font-semibold">Telefoonnummer:</span> {selectedRequest.phoneNumber}</p>
                {selectedRequest.gender && <p><span className="font-semibold">Geslacht:</span> {selectedRequest.gender}</p>}
                {selectedRequest.birthDate && <p><span className="font-semibold">Geboortedatum:</span> {formatDate(selectedRequest.birthDate)}</p>}
              </div>
              
              <div>
                <h3 className="font-semibold mb-1">Adres</h3>
                <p>
                  {selectedRequest.street} {selectedRequest.houseNumber}
                  {selectedRequest.busNumber && `, bus ${selectedRequest.busNumber}`}
                </p>
                <p>{selectedRequest.postalCode} {selectedRequest.city}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-1">Lidmaatschap</h3>
                <p><span className="font-semibold">Type:</span> {selectedRequest.membershipType}</p>
                <p><span className="font-semibold">Datum aanvraag:</span> {formatDate(selectedRequest.requestDate)}</p>
                
                {selectedRequest.status === "approved" && (
                  <p><span className="font-semibold">Lidnummer:</span> {selectedRequest.memberNumber || "Wordt toegewezen"}</p>
                )}
                
                {selectedRequest.status === "rejected" && selectedRequest.rejectionReason && (
                  <div>
                    <h3 className="font-semibold mb-1 text-red-600">Reden afwijzing</h3>
                    <p>{selectedRequest.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aanvraag goedkeuren</DialogTitle>
            <DialogDescription>
              U staat op het punt om deze lidmaatschapsaanvraag goed te keuren.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-2">
              <p className="mb-4">
                Weet u zeker dat u de aanvraag van <span className="font-semibold">{selectedRequest.firstName} {selectedRequest.lastName}</span> wilt goedkeuren?
              </p>
              
              {/* Controleer of deze persoon andere aanvragen heeft die al zijn goedgekeurd */}
              {(() => {
                const otherRequests = requests?.filter(req => 
                  req.firstName === selectedRequest.firstName && 
                  req.lastName === selectedRequest.lastName && 
                  req.id !== selectedRequest.id
                ) || [];
                
                // Controleer of er al een goedgekeurde aanvraag is met een lidnummer
                const approvedRequest = otherRequests.find(r => r.status === "approved" && r.memberId);
                
                if (approvedRequest) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <p className="text-amber-700 font-medium flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Let op: Deze persoon is al lid!
                      </p>
                      <p className="text-amber-700 text-sm mt-1">
                        Deze persoon heeft al een goedgekeurde aanvraag en is lid sinds {formatDate(approvedRequest.processedDate)} met lidnummer #{approvedRequest.memberNumber}.
                      </p>
                      <p className="text-amber-700 text-sm mt-1">
                        Weet u zeker dat u een tweede lidmaatschap wilt toekennen?
                      </p>
                    </div>
                  );
                }
                
                // Controleer of er aanvragen in behandeling zijn
                const pendingRequests = otherRequests.filter(r => r.status === "pending");
                if (pendingRequests.length > 0) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-blue-700 font-medium flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Let op: Meerdere aanvragen
                      </p>
                      <p className="text-blue-700 text-sm mt-1">
                        Deze persoon heeft nog {pendingRequests.length} andere aanvra{pendingRequests.length === 1 ? 'ag' : 'gen'} in behandeling.
                      </p>
                    </div>
                  );
                }
                
                return null;
              })()}
              
              <p className="mb-2">
                Na goedkeuring:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Wordt de aanvrager lid van de moskee</li>
                <li>Krijgt de aanvrager een lidnummer toegewezen</li>
                <li>Verschijnt de aanvraag in de lijst "Verwerkt"</li>
              </ul>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : "Goedkeuren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aanvraag afwijzen</DialogTitle>
            <DialogDescription>
              U staat op het punt om deze lidmaatschapsaanvraag af te wijzen.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-2">
              <p className="mb-4">
                Wilt u de aanvraag van <span className="font-semibold">{selectedRequest.firstName} {selectedRequest.lastName}</span> afwijzen?
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reden voor afwijzing (verplicht)</Label>
                <Textarea
                  id="reason"
                  placeholder="Geef een reden waarom deze aanvraag wordt afgewezen..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={confirmRejection}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : "Afwijzen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}