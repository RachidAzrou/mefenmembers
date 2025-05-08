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
  DialogTitle,
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
  Search, 
  ArrowLeft,
  PencilIcon,
  Save
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

  // Ophalen van alle aanvragen
  const { data: requests, isLoading } = useQuery<MemberRequest[]>({
    queryKey: ["/api/member-requests"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Goedkeuren van een aanvraag
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/member-requests/approve?id=${id}`, {
        processedBy: 1 // TODO: vervangen door echte gebruikers-ID
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Aanvraag goedgekeurd",
        description: "De aanvraag is succesvol goedgekeurd en het lid is aangemaakt.",
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
        notes: reason
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      toast({
        title: "Aanvraag afgewezen",
        description: "De aanvraag is succesvol afgewezen.",
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
  const pendingRequests = requests?.filter(req => req.status === "pending") || [];
  
  // Filter verwerkte aanvragen op datum (alleen van de afgelopen 7 dagen)
  const processedRequests = requests?.filter(req => {
    // Alleen niet-pending aanvragen
    if (req.status === "pending") return false;
    
    // Check of aanvraag niet ouder is dan 7 dagen
    const requestDate = req.processedDate ? new Date(req.processedDate) : new Date(req.requestDate);
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
  const { data: generatedNumber } = useQuery<{ memberNumber: string }>({
    queryKey: ["/api/members/generate-number"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: false, // We roepen deze query handmatig aan
  });

  const handleApprove = async (request: MemberRequest) => {
    setSelectedRequest(request);
    
    try {
      // Eerst het volgende beschikbare lidnummer ophalen
      const response = await fetch('/api/members/generate-number');
      if (!response.ok) throw new Error('Kon geen lidnummer genereren');
      const data = await response.json();
      setNextMemberNumber(data.memberNumber);
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
      approveMutation.mutate(selectedRequest.id);
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
        return <Badge variant="outline">In behandeling</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500">Goedgekeurd</Badge>;
      case "rejected":
        return <Badge variant="destructive">Afgewezen</Badge>;
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
                  <TableHead className="w-[160px]">Naam</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell w-[100px]">Datum</TableHead>
                  <TableHead className="text-right w-[120px]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Geen aanvragen in behandeling
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {request.firstName} {request.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {request.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(request.requestDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Search className="h-4 w-4" />
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
                  <TableHead className="w-[160px]">Naam</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell w-[100px]">Datum</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[80px]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Geen verwerkte aanvragen in de afgelopen 7 dagen
                    </TableCell>
                  </TableRow>
                ) : (
                  processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.firstName} {request.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {request.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(request.processedDate || request.requestDate)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Bekijken</span>
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(request)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              </svg>
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
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-[#963E56]">Aanvraagdetails</span>
              {selectedRequest?.status === "pending" && (
                <Badge variant="outline">In behandeling</Badge>
              )}
              {selectedRequest?.status === "approved" && (
                <Badge variant="default" className="bg-green-500">Goedgekeurd</Badge>
              )}
              {selectedRequest?.status === "rejected" && (
                <Badge variant="destructive">Afgewezen</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Aanvraag ingediend op {selectedRequest && formatDate(selectedRequest.requestDate)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(100vh-240px)] pr-2">
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-[#963E56] uppercase tracking-wider mb-1">Persoonlijke gegevens</p>
                <p className="text-xl font-semibold">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
                
                {/* Leeftijd berekenen en tonen */}
                {selectedRequest?.birthDate && (
                  <p className="text-sm text-gray-600 mt-1">
                    Leeftijd: {calculateAge(new Date(selectedRequest.birthDate))} jaar
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <LocationCard request={selectedRequest} />
                <MembershipCard request={selectedRequest} />
              </div>
            </div>
            
            {/* Contactgegevens */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-[#963E56] uppercase tracking-wider mb-3">Contactgegevens</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
                  <p className="text-xs text-gray-600 font-medium mb-1">Email</p>
                  <p className="font-medium">{selectedRequest?.email}</p>
                </div>
                <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
                  <p className="text-xs text-gray-600 font-medium mb-1">Telefoon</p>
                  <p className="font-medium">{selectedRequest?.phoneNumber}</p>
                </div>
              </div>
            </div>
            
            {/* Extra informatie */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-[#963E56] uppercase tracking-wider mb-3">Extra informatie</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
                  <p className="text-xs text-gray-600 font-medium mb-1">Geslacht</p>
                  <p className="font-medium">
                    {selectedRequest?.gender === "man" ? "Man" : 
                     selectedRequest?.gender === "vrouw" ? "Vrouw" : ""}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
                  <p className="text-xs text-gray-600 font-medium mb-1">Nationaliteit</p>
                  <p className="font-medium">{selectedRequest?.nationality || ""}</p>
                </div>
                <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
                  <p className="text-xs text-gray-600 font-medium mb-1">Geboortedatum</p>
                  <p className="font-medium">{selectedRequest?.birthDate ? formatDate(selectedRequest.birthDate) : ""}</p>
                </div>
              </div>
            </div>
            
            {/* Betalingsdetails */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-[#963E56] uppercase tracking-wider mb-3">Betalingsdetails</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PaymentDetailsCard request={selectedRequest} />
              </div>
            </div>
            
            {/* Afwijzingsreden tonen indien afgewezen */}
            {selectedRequest?.status === "rejected" && selectedRequest?.notes && (
              <div className="bg-red-50 p-4 rounded-lg mb-4 border border-red-200">
                <p className="text-sm font-medium text-red-700 uppercase tracking-wider mb-2">Reden voor afwijzing</p>
                <p className="text-gray-800">{selectedRequest.notes}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => setShowDetailDialog(false)}
              className="sm:order-1 w-full sm:w-auto"
            >
              Sluiten
            </Button>
            
            {selectedRequest?.status === "pending" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleReject(selectedRequest);
                  }}
                  className="flex-1 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Afwijzen
                </Button>
                <Button 
                  type="button"
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleApprove(selectedRequest);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Goedkeuren
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Goedkeuren dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Aanvraag goedkeuren</DialogTitle>
            <DialogDescription>
              Bevestig om deze aanvraag goed te keuren en een nieuw lid aan te maken.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-white border border-green-200 rounded-md p-4 mb-4">
            {nextMemberNumber && (
              <div className="mb-3 bg-green-50 p-2 border border-green-100 rounded-md text-center">
                <p className="text-sm text-green-700 font-medium">Nieuw lidnummer</p>
                <p className="text-xl font-bold text-green-800">{nextMemberNumber}</p>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <p className="font-medium">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
              
              {/* Leeftijd berekenen en tonen */}
              {selectedRequest?.birthDate && (
                <p className="text-sm text-gray-600">
                  Leeftijd: {calculateAge(new Date(selectedRequest.birthDate))} jaar
                </p>
              )}
              
              {/* Gemeente tonen */}
              {selectedRequest?.city && (
                <p className="text-sm text-gray-600">
                  Gemeente: {selectedRequest.city}
                </p>
              )}

              {/* Lidmaatschapstype tonen */}
              <div className="pt-2">
                <p className="text-sm font-medium">Type lidmaatschap:</p>
                <p>{formatMembershipTypeLabel(selectedRequest?.membershipType)}</p>
              </div>

              {/* Betalingsmethode tonen */}
              <div>
                <p className="text-sm font-medium">Betalingsmethode:</p>
                <p>{formatPaymentMethodLabel(selectedRequest?.paymentMethod)}</p>
              </div>
              
              {/* Betalingstermijn tonen */}
              <div>
                <p className="text-sm font-medium">Betalingstermijn:</p>
                <p>{formatPaymentTermLabel(selectedRequest?.paymentTerm)}</p>
              </div>
              
              {/* Automatische vernieuwing tonen */}
              <div>
                <p className="text-sm font-medium">Automatische verlenging:</p>
                <p>{formatAutoRenewLabel(selectedRequest?.autoRenew)}</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              className="w-full sm:w-auto mb-2 sm:mb-0"
            >
              Annuleren
            </Button>
            <Button 
              onClick={confirmApproval}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bevestig goedkeuring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Afwijzen dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Aanvraag afwijzen</DialogTitle>
            <DialogDescription>
              Geef een reden op voor de afwijzing van deze aanvraag.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white border border-red-200 rounded-md p-4 mb-4">
            <div className="flex flex-col space-y-2">
              <p className="font-medium">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
              
              {/* Leeftijd berekenen en tonen */}
              {selectedRequest?.birthDate && (
                <p className="text-sm text-gray-600">
                  Leeftijd: {calculateAge(new Date(selectedRequest.birthDate))} jaar
                </p>
              )}
              
              {/* Gemeente tonen */}
              {selectedRequest?.city && (
                <p className="text-sm text-gray-600">
                  Gemeente: {selectedRequest.city}
                </p>
              )}

              {/* Lidmaatschapstype tonen */}
              <div className="pt-2">
                <p className="text-sm font-medium">Type lidmaatschap:</p>
                <p>{formatMembershipTypeLabel(selectedRequest?.membershipType)}</p>
              </div>

              {/* Betalingsmethode tonen */}
              <div>
                <p className="text-sm font-medium">Betalingsmethode:</p>
                <p>{formatPaymentMethodLabel(selectedRequest?.paymentMethod)}</p>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="rejection-reason" className="text-red-600 font-medium">
              Reden voor afwijzing (verplicht)
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Geef een reden..."
              className="mt-1 border-red-200"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectionDialog(false)}
              className="w-full sm:w-auto mb-2 sm:mb-0"
            >
              Annuleren
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRejection}
              className="w-full sm:w-auto"
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bevestig afwijzing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}