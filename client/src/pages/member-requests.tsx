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
import { format } from "date-fns";
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
  const processedRequests = requests?.filter(req => req.status !== "pending") || [];
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy", { locale: nl });
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

        <TabsContent value="pending">
          {showDetailView && selectedRequest ? (
            // Detail view voor een aanvraag
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 border-[#963E56]/30 hover:bg-[#963E56]/5 hover:border-[#963E56]/50 transition-all pl-3 pr-4 py-2"
                  onClick={() => {
                    setShowDetailView(false);
                    setSelectedRequest(null);
                    setEditedRequest(null);
                    setIsEditing(false);
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Terug naar overzicht</span>
                </Button>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button 
                        variant="outline" 
                        className="text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-400"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedRequest(null);
                        }}
                      >
                        <XIcon className="h-4 w-4 mr-2" />
                        Annuleren
                      </Button>
                      <Button 
                        className="bg-[#963E56] hover:bg-[#7d3447] text-white"
                        onClick={() => {
                          if (editedRequest) {
                            updateMutation.mutate(editedRequest);
                          }
                        }}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Bezig...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Opslaan
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="text-[#963E56] hover:text-[#7d3447] border-[#963E56]/20 hover:border-[#963E56]/40"
                        onClick={() => {
                          setIsEditing(true);
                          setEditedRequest(selectedRequest);
                        }}
                      >
                        <PencilIcon className="mr-2 h-4 w-4" />
                        Bewerken
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-md border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Detail aanvraag
                </h2>
                <div className="text-sm text-gray-500 mb-6 flex flex-col gap-1">
                  <p className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>Aanvraagdatum: {formatDate(selectedRequest.requestDate)}</span>
                  </p>
                  <p className="flex items-center gap-2">{getStatusBadge(selectedRequest.status)}</p>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#963E56] mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Persoonlijke gegevens
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Voornaam</Label>
                      <Input
                        id="firstName"
                        value={editedRequest?.firstName || selectedRequest.firstName}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, firstName: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Achternaam</Label>
                      <Input
                        id="lastName"
                        value={editedRequest?.lastName || selectedRequest.lastName}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, lastName: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Geslacht</Label>
                      <Select
                        value={editedRequest?.gender || selectedRequest.gender || ""}
                        onValueChange={(value: string) => setEditedRequest({...editedRequest || selectedRequest, gender: value})}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="gender" className="mt-1">
                          <SelectValue placeholder="Selecteer geslacht" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="man">Man</SelectItem>
                          <SelectItem value="vrouw">Vrouw</SelectItem>
                          <SelectItem value="anders">Anders</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="birthDate">Geboortedatum</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={editedRequest?.birthDate || selectedRequest.birthDate || ""}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, birthDate: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mailadres</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedRequest?.email || selectedRequest.email}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, email: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Telefoonnummer</Label>
                      <Input
                        id="phoneNumber"
                        value={editedRequest?.phoneNumber || selectedRequest.phoneNumber}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, phoneNumber: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nationality">Nationaliteit</Label>
                      <Input
                        id="nationality"
                        value={editedRequest?.nationality || selectedRequest.nationality || ""}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, nationality: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#963E56] mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Adresgegevens
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="street">Straat</Label>
                      <Input
                        id="street"
                        value={editedRequest?.street || selectedRequest.street || ""}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, street: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="houseNumber">Huisnummer</Label>
                        <Input
                          id="houseNumber"
                          value={editedRequest?.houseNumber || selectedRequest.houseNumber || ""}
                          onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, houseNumber: e.target.value})}
                          className="mt-1"
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="busNumber">Bus</Label>
                        <Input
                          id="busNumber"
                          value={editedRequest?.busNumber || selectedRequest.busNumber || ""}
                          onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, busNumber: e.target.value})}
                          className="mt-1"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postcode</Label>
                      <Input
                        id="postalCode"
                        value={editedRequest?.postalCode || selectedRequest.postalCode || ""}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, postalCode: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Stad</Label>
                      <Input
                        id="city"
                        value={editedRequest?.city || selectedRequest.city || ""}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, city: e.target.value})}
                        className="mt-1"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#963E56] mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect width="8" height="6" x="8" y="2" rx="1" />
                      <path d="M12 11h4" />
                      <path d="M12 16h4" />
                      <path d="M8 11h.01" />
                      <path d="M8 16h.01" />
                    </svg>
                    Lidmaatschapsgegevens
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="membershipType">Type lidmaatschap</Label>
                      <Select 
                        value={(editedRequest?.membershipType || selectedRequest.membershipType) as "standaard" | "student" | "senior"}
                        onValueChange={(value: "standaard" | "student" | "senior") => setEditedRequest({...editedRequest || selectedRequest, membershipType: value})}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="membershipType" className="mt-1">
                          <SelectValue placeholder="Selecteer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standaard">Standaard</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#963E56] mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    Betaalgegevens
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentMethod">Betaalwijze</Label>
                      <Select 
                        value={(editedRequest?.paymentMethod || selectedRequest.paymentMethod || "overschrijving") as "cash" | "domiciliering" | "overschrijving" | "bancontact"}
                        onValueChange={(value) => setEditedRequest({...editedRequest || selectedRequest, paymentMethod: value as "cash" | "domiciliering" | "overschrijving" | "bancontact"})}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="paymentMethod" className="mt-1">
                          <SelectValue placeholder="Selecteer betaalwijze" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bancontact">Bancontact</SelectItem>
                          <SelectItem value="overschrijving">Overschrijving</SelectItem>
                          <SelectItem value="domiciliering">Domiciliëring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="paymentTerm">Betalingstermijn</Label>
                      <Select 
                        value={(editedRequest?.paymentTerm || selectedRequest.paymentTerm || "jaarlijks") as "maandelijks" | "driemaandelijks" | "jaarlijks"}
                        onValueChange={(value) => setEditedRequest({...editedRequest || selectedRequest, paymentTerm: value as "maandelijks" | "driemaandelijks" | "jaarlijks"})}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="paymentTerm" className="mt-1">
                          <SelectValue placeholder="Selecteer betalingstermijn" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jaarlijks">Jaarlijks</SelectItem>
                          <SelectItem value="driemaandelijks">Driemaandelijks</SelectItem>
                          <SelectItem value="maandelijks">Maandelijks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="autoRenew" 
                        checked={editedRequest?.autoRenew || selectedRequest.autoRenew || false}
                        onCheckedChange={(checked: boolean) => 
                          setEditedRequest({...editedRequest || selectedRequest, autoRenew: checked})
                        }
                        disabled={!isEditing}
                        className="data-[state=checked]:bg-[#963E56] data-[state=checked]:border-[#963E56]"
                      />
                      <Label htmlFor="autoRenew" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Automatisch verlengen
                      </Label>
                    </div>
                    
                    {/* Alleen rekeninggegevens tonen als betaalwijze domiciliëring of overschrijving is */}
                    {((editedRequest?.paymentMethod || selectedRequest.paymentMethod) === "domiciliering" ||
                      (editedRequest?.paymentMethod || selectedRequest.paymentMethod) === "overschrijving") && (
                      <>
                        <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                          <h4 className="text-sm font-semibold mb-3">Rekeninggegevens</h4>
                        </div>
                        
                        <div>
                          <Label htmlFor="accountNumber">IBAN</Label>
                          <Input
                            id="accountNumber"
                            value={editedRequest?.accountNumber || selectedRequest.accountNumber || ''}
                            onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, accountNumber: e.target.value})}
                            className="mt-1"
                            disabled={!isEditing}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="accountHolderName">Naam rekeninghouder</Label>
                          <Input
                            id="accountHolderName"
                            value={editedRequest?.accountHolderName || selectedRequest.accountHolderName || ''}
                            onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, accountHolderName: e.target.value})}
                            className="mt-1"
                            disabled={!isEditing}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="bicSwift">BIC/SWIFT-code</Label>
                          <Input
                            id="bicSwift"
                            value={editedRequest?.bicSwift || selectedRequest.bicSwift || ''}
                            onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, bicSwift: e.target.value})}
                            className="mt-1"
                            disabled={!isEditing}
                          />
                          <p className="text-xs text-gray-500 mt-1">Alleen nodig voor buitenlandse rekeningen</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-[#963E56]/20 bg-[#963E56]/5 rounded-md mb-6">
                  <h3 className="text-lg font-semibold text-[#963E56] mb-2 flex items-center gap-2">
                    <AlertCircle className="text-[#963E56] h-5 w-5" />
                    Reden voor afwijzing
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Alleen invullen als je deze aanvraag wilt afwijzen. Deze informatie is alleen voor intern gebruik.
                  </p>
                  <Textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Beschrijf waarom deze aanvraag wordt afgewezen..."
                    className="min-h-[100px] border-[#963E56]/20 bg-white focus:ring-[#963E56]"
                    disabled={!isEditing && selectedRequest.status !== "pending"}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
                <Button 
                  variant="outline"
                  className="border-[#963E56]/30 hover:bg-[#963E56]/5 hover:border-[#963E56]/50 transition-all gap-2 pl-3 pr-4 py-2"
                  onClick={() => setShowDetailView(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Terug naar overzicht</span>
                </Button>
                
                {selectedRequest.status === "pending" && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Button 
                        className="bg-[#963E56] hover:bg-[#7d3447] text-white px-5"
                        onClick={() => {
                          // Save changes to the edited request
                          if (editedRequest) {
                            updateMutation.mutate(editedRequest);
                          }
                          setIsEditing(false);
                        }}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Opslaan...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Wijzigingen opslaan
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            setShowDetailView(false);
                            if (rejectionReason.trim()) {
                              confirmRejection();
                            } else {
                              setShowRejectionDialog(true);
                            }
                          }}
                          disabled={rejectMutation.isPending}
                        >
                          <XIcon className="mr-2 h-4 w-4" />
                          Afwijzen
                        </Button>
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            setShowDetailView(false);
                            setShowApprovalDialog(true);
                          }}
                          disabled={approveMutation.isPending}
                        >
                          <CheckIcon className="mr-2 h-4 w-4" />
                          Goedkeuren
                        </Button>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => setIsEditing(true)}
                        >
                          <PencilIcon className="mr-2 h-4 w-4" />
                          Bewerken
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {selectedRequest.status !== "pending" && (
                  <div className="text-sm bg-gray-100 px-4 py-2 rounded-md border">
                    {selectedRequest.status === "approved" ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <CheckIcon className="h-4 w-4" /> Goedgekeurd op {formatDate(selectedRequest.processedDate || '')}
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <XIcon className="h-4 w-4" /> Afgewezen op {formatDate(selectedRequest.processedDate || '')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Lijstweergave van aanvragen
            <div>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-10">
                  <div className="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                      <path d="M12 11h4"></path>
                      <path d="M12 16h4"></path>
                      <path d="M8 11h.01"></path>
                      <path d="M8 16h.01"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-500">Geen aanvragen in behandeling</h3>
                  <p className="text-gray-400 mt-2">
                    Er zijn momenteel geen openstaande lidmaatschapsaanvragen om te behandelen.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.firstName} {request.lastName}
                          </TableCell>
                          <TableCell>{formatDate(request.requestDate)}</TableCell>
                          <TableCell className="text-right space-x-1 whitespace-nowrap">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                // Navigeer naar detailpagina binnen de app
                                setLocation(`/member-request-detail/${request.id}`);
                              }}
                              className="text-primary hover:text-primary/80"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleApprove(request)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="h-4 w-4"
                              >
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleReject(request)}
                              className="text-red-500 hover:text-red-800"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="h-4 w-4"
                              >
                                <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0 0a9.99 9.99 0 0 1-8.94-5.5M12 8v4m0 4h.01"></path>
                              </svg>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(request)}
                              className="text-gray-500 hover:text-gray-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="processed">
          {processedRequests.length === 0 ? (
            <div className="text-center py-10">
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="M12 11h4"></path>
                  <path d="M12 16h4"></path>
                  <path d="M8 11h.01"></path>
                  <path d="M8 16h.01"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-500">Geen verwerkte aanvragen</h3>
              <p className="text-gray-400 mt-2">
                Er zijn nog geen verwerkte lidmaatschapsaanvragen.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.firstName} {request.lastName}
                      </TableCell>
                      <TableCell>{formatDate(request.requestDate)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            // Navigeer naar detailpagina binnen de app
                            setLocation(`/member-request-detail/${request.id}`);
                          }}
                          className="text-primary hover:text-primary/80"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog voor afwijzen */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="h-5 w-5 text-red-500"
              >
                <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0 0a9.99 9.99 0 0 1-8.94-5.5M12 8v4m0 4h.01"></path>
              </svg>
              Aanvraag afwijzen
            </DialogTitle>
            <DialogDescription>
              Weet je zeker dat je deze aanvraag wilt afwijzen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="bg-gradient-to-r from-rose-50 to-white p-4 rounded-md space-y-3 border border-rose-100 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-rose-700">Naam</p>
                  <p className="font-medium">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-rose-700">Toe te kennen lidnummer</p>
                  <p className="font-mono font-medium">{nextMemberNumber || "Wordt toegekend"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-rose-700">Betaalwijze</p>
                  <p>
                    {selectedRequest?.paymentMethod === "cash" && "Cash"}
                    {selectedRequest?.paymentMethod === "bancontact" && "Bancontact"}
                    {selectedRequest?.paymentMethod === "overschrijving" && "Overschrijving"}
                    {selectedRequest?.paymentMethod === "domiciliering" && "Domiciliëring"}
                    {!selectedRequest?.paymentMethod && "Overschrijving (standaard)"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-rose-700">Betalingstermijn</p>
                  <p>
                    {selectedRequest?.paymentTerm === "maandelijks" && "Maandelijks"}
                    {selectedRequest?.paymentTerm === "driemaandelijks" && "Driemaandelijks"}
                    {selectedRequest?.paymentTerm === "jaarlijks" && "Jaarlijks"}
                    {!selectedRequest?.paymentTerm && "Jaarlijks (standaard)"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-rose-700">Type lidmaatschap</p>
                <p>
                  {selectedRequest?.membershipType === "standaard" && "Standaard"}
                  {selectedRequest?.membershipType === "student" && "Student"}
                  {selectedRequest?.membershipType === "senior" && "Senior"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                Reden voor afwijzing
              </Label>
              <Textarea 
                id="rejection-reason" 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Beschrijf waarom deze aanvraag wordt afgewezen..."
                className="min-h-[100px] border-rose-200 focus:ring-rose-300"
              />
              <p className="text-xs text-gray-500">
                Deze informatie is alleen voor intern gebruik.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
              className="border-gray-300"
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Afwijzen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog voor goedkeuren */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Aanvraag goedkeuren
            </DialogTitle>
            <DialogDescription>
              Wil je deze lidmaatschapsaanvraag goedkeuren? Dit lid wordt dan toegevoegd aan het ledenbestand.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-white p-4 rounded-md space-y-3 border border-emerald-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Naam</p>
                  <p className="font-medium">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Toe te kennen lidnummer</p>
                  <p className="font-mono font-medium">{nextMemberNumber || "Wordt toegekend"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Betaalwijze</p>
                  <p>
                    {selectedRequest?.paymentMethod === "cash" && "Cash"}
                    {selectedRequest?.paymentMethod === "bancontact" && "Bancontact"}
                    {selectedRequest?.paymentMethod === "overschrijving" && "Overschrijving"}
                    {selectedRequest?.paymentMethod === "domiciliering" && "Domiciliëring"}
                    {!selectedRequest?.paymentMethod && "Overschrijving (standaard)"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Betalingstermijn</p>
                  <p>
                    {selectedRequest?.paymentTerm === "maandelijks" && "Maandelijks"}
                    {selectedRequest?.paymentTerm === "driemaandelijks" && "Driemaandelijks"}
                    {selectedRequest?.paymentTerm === "jaarlijks" && "Jaarlijks"}
                    {!selectedRequest?.paymentTerm && "Jaarlijks (standaard)"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700">Type lidmaatschap</p>
                <p>
                  {selectedRequest?.membershipType === "standaard" && "Standaard"}
                  {selectedRequest?.membershipType === "student" && "Student"}
                  {selectedRequest?.membershipType === "senior" && "Senior"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              className="border-gray-300"
            >
              Annuleren
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Goedkeuren"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}