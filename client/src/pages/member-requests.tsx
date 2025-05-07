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
import { 
  CheckIcon, 
  Loader2, 
  ShieldAlertIcon, 
  XIcon, 
  Search, 
  ArrowLeft 
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
}

export default function MemberRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<MemberRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [editedRequest, setEditedRequest] = useState<MemberRequest | null>(null);
  const [nextMemberNumber, setNextMemberNumber] = useState<string | null>(null);
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
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    setShowDetailView(false);
                    setSelectedRequest(null);
                  }}
                >
                  <ArrowLeft size={16} />
                  Terug naar lijst
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="text-green-600 hover:text-green-800 border-green-200 hover:border-green-400"
                    onClick={() => handleApprove(selectedRequest)}
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Goedkeuren
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-400"
                    onClick={() => handleReject(selectedRequest)}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Afwijzen
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Persoonsgegevens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Naam</p>
                      <p className="font-medium">{selectedRequest.firstName} {selectedRequest.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Geslacht</p>
                      <p>{selectedRequest.gender || "Niet opgegeven"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Geboortedatum</p>
                      <p>{formatDate(selectedRequest.birthDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Nationaliteit</p>
                      <p>{selectedRequest.nationality || "Niet opgegeven"}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contactgegevens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">E-mail</p>
                      <p className="font-medium">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefoonnummer</p>
                      <p>{selectedRequest.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Adres</p>
                      <p>
                        {selectedRequest.street} {selectedRequest.houseNumber}
                        {selectedRequest.busNumber && `, bus ${selectedRequest.busNumber}`}
                        <br />
                        {selectedRequest.postalCode} {selectedRequest.city}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lidmaatschap</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Type lidmaatschap</p>
                      <p className="capitalize">{selectedRequest.membershipType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Aanvraagdatum</p>
                      <p>{formatDate(selectedRequest.requestDate)}</p>
                    </div>
                  </CardContent>
                </Card>
                
                {selectedRequest.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{selectedRequest.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-10 rounded-md bg-gray-50">
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-3">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p className="text-gray-500 font-medium">Er zijn geen aanvragen in behandeling</p>
                    <p className="text-gray-400 text-sm mt-1">Nieuwe aanvragen zullen hier verschijnen</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Aanvraagdatum</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="font-medium">{request.firstName} {request.lastName}</div>
                          </TableCell>
                          <TableCell>{formatDate(request.requestDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                                onClick={() => handleApprove(request)}
                                title="Goedkeuren"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                onClick={() => handleReject(request)}
                                title="Afwijzen"
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDetailView(true);
                                }}
                                title="Details bekijken"
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="processed">
          {showDetailView && selectedRequest ? (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    setShowDetailView(false);
                    setSelectedRequest(null);
                  }}
                >
                  <ArrowLeft size={16} />
                  Terug naar lijst
                </Button>
                <div className="flex gap-2">
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-400"
                      onClick={() => handleDelete(selectedRequest)}
                    >
                      <XIcon className="h-4 w-4 mr-2" />
                      Verwijderen
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Persoonsgegevens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Naam</p>
                      <p className="font-medium">{selectedRequest.firstName} {selectedRequest.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Geslacht</p>
                      <p>{selectedRequest.gender || "Niet opgegeven"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Geboortedatum</p>
                      <p>{formatDate(selectedRequest.birthDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Nationaliteit</p>
                      <p>{selectedRequest.nationality || "Niet opgegeven"}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contactgegevens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">E-mail</p>
                      <p className="font-medium">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefoonnummer</p>
                      <p>{selectedRequest.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Adres</p>
                      <p>
                        {selectedRequest.street} {selectedRequest.houseNumber}
                        {selectedRequest.busNumber && `, bus ${selectedRequest.busNumber}`}
                        <br />
                        {selectedRequest.postalCode} {selectedRequest.city}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lidmaatschap</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Type lidmaatschap</p>
                      <p className="capitalize">{selectedRequest.membershipType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Verwerkingsstatus</p>
                      <p>{getStatusBadge(selectedRequest.status)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Aanvraagdatum</p>
                      <p>{formatDate(selectedRequest.requestDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Verwerkingsdatum</p>
                      <p>{formatDate(selectedRequest.processedDate)}</p>
                    </div>
                  </CardContent>
                </Card>
                
                {selectedRequest.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{selectedRequest.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <>
              {processedRequests.length === 0 ? (
                <div className="text-center py-10 rounded-md bg-gray-50">
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-3">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <p className="text-gray-500 font-medium">Er zijn geen verwerkte aanvragen</p>
                    <p className="text-gray-400 text-sm mt-1">Verwerkte aanvragen zullen hier verschijnen</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Verwerkingsdatum</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="font-medium">{request.firstName} {request.lastName}</div>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>{formatDate(request.processedDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end space-x-2">
                              {isAdmin && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                  onClick={() => handleDelete(request)}
                                  title="Verwijderen"
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDetailView(true);
                                }}
                                title="Details bekijken"
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Goedkeurings dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#963E56]/90 to-[#963E56] py-4 px-6 text-white">
            <DialogHeader className="text-white mb-0 p-0">
              <DialogTitle className="flex items-center gap-2 text-lg text-white">
                <CheckIcon className="h-5 w-5" />
                Lidmaatschapsaanvraag goedkeuren
              </DialogTitle>
              <DialogDescription className="text-white/90">
                Je staat op het punt om de aanvraag van <span className="font-semibold text-white">{selectedRequest?.firstName} {selectedRequest?.lastName}</span> goed te keuren.
                Dit zal automatisch een nieuw lid aanmaken met de gegevens uit deze aanvraag.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6">
            <div className="bg-[#963E56]/5 border border-[#963E56]/20 rounded-md p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#963E56]">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="font-semibold text-[#963E56]">Lidmaatschapsgegevens</h3>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-md border border-[#963E56]/20 p-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#963E56]">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect width="8" height="6" x="8" y="2" rx="1" />
                  <path d="M12 11h4" />
                  <path d="M12 16h4" />
                  <path d="M8 11h.01" />
                  <path d="M8 16h.01" />
                </svg>
                <p className="text-sm text-gray-700">
                  Lidnummer: <span className="font-bold text-[#963E56]">{nextMemberNumber ? nextMemberNumber.toString().padStart(4, '0') : "..."}</span>
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Naam</p>
                  <p className="font-medium truncate">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Type lidmaatschap</p>
                  <p className="capitalize truncate">{selectedRequest?.membershipType}</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Betaalstatus</p>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
                    Moet nog betalen
                  </Badge>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Betaaltermijn</p>
                  <p className="truncate">Jaarlijks</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded-md border border-[#963E56]/10 shadow-sm">
                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 mt-0.5 flex-shrink-0">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>
                    <strong>Belangrijk:</strong> Na goedkeuring wordt het nieuwe lid aangemaakt met betaalstatus "Niet betaald". 
                    Je kunt de betaalstatus later bijwerken op de ledenpagina.
                  </span>
                </p>
              </div>
            </div>
            
            <DialogFooter className="gap-2 pt-2 flex sm:justify-between">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)} className="px-6">
                Annuleren
              </Button>
              <Button 
                className="bg-[#963E56] hover:bg-[#7d3447] text-white px-6"
                onClick={confirmApproval}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig...
                  </>
                ) : (
                  <>
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Goedkeuren en lid aanmaken
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Afwijzings dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#963E56]/90 to-[#963E56] py-4 px-6 text-white">
            <DialogHeader className="text-white mb-0 p-0">
              <DialogTitle className="flex items-center gap-2 text-lg text-white">
                <XIcon className="h-5 w-5" />
                Lidmaatschapsaanvraag afwijzen
              </DialogTitle>
              <DialogDescription className="text-white/90">
                Je staat op het punt om de aanvraag van <span className="font-semibold text-white">{selectedRequest?.firstName} {selectedRequest?.lastName}</span> af te wijzen.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6">
            <div className="bg-[#963E56]/5 border border-[#963E56]/20 rounded-md p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#963E56]">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="font-semibold text-[#963E56]">Lidmaatschapsgegevens</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Naam</p>
                  <p className="font-medium truncate">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Type lidmaatschap</p>
                  <p className="capitalize truncate">{selectedRequest?.membershipType}</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Betaalstatus</p>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
                    Moet nog betalen
                  </Badge>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">Aanvraagdatum</p>
                  <p className="truncate">{selectedRequest?.requestDate ? formatDate(selectedRequest.requestDate) : 'N/A'}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#963E56]">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <h3 className="font-semibold text-[#963E56]">Reden voor afwijzing</h3>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-[#963E56]/10 shadow-sm">
                  <p className="text-sm text-gray-600 mb-2 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 mt-0.5 flex-shrink-0">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>
                      Deze informatie is alleen voor intern gebruik en wordt niet automatisch gecommuniceerd naar de aanvrager.
                    </span>
                  </p>
                  <Textarea 
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Beschrijf waarom deze aanvraag wordt afgewezen..."
                    className="min-h-[100px] w-full border-[#963E56]/10 focus:ring-[#963E56]"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2 pt-2 flex sm:justify-between">
              <Button variant="outline" onClick={() => setShowRejectionDialog(false)} className="px-6">
                Annuleren
              </Button>
              <Button 
                className="bg-[#963E56] hover:bg-[#7d3447] text-white px-6"
                onClick={confirmRejection}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig...
                  </>
                ) : (
                  <>
                    <XIcon className="mr-2 h-4 w-4" />
                    Aanvraag afwijzen
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail weergave */}
      {showDetailView && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#963E56]/90 to-[#963E56] py-4 px-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M7 7h10" />
                    <path d="M7 12h10" />
                    <path d="M7 17h10" />
                  </svg>
                  Lidmaatschapsaanvraag details
                </h2>
                <p className="text-sm text-white/80">
                  {selectedRequest.firstName} {selectedRequest.lastName} - Aangevraagd op {formatDate(selectedRequest.requestDate)}
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
                onClick={() => setShowDetailView(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content - scrollbaar gedeelte */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#963E56] mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Persoonsgegevens
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstname">Voornaam</Label>
                    <Input
                      id="firstname"
                      value={editedRequest?.firstName || selectedRequest.firstName}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, firstName: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastname">Achternaam</Label>
                    <Input
                      id="lastname"
                      value={editedRequest?.lastName || selectedRequest.lastName}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, lastName: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="gender">Geslacht</Label>
                    <Select 
                      value={editedRequest?.gender || selectedRequest.gender || ''}
                      onValueChange={(value) => setEditedRequest({...editedRequest || selectedRequest, gender: value})}
                    >
                      <SelectTrigger id="gender" className="mt-1">
                        <SelectValue placeholder="Selecteer geslacht" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="vrouw">Vrouw</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="birthdate">Geboortedatum</Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={editedRequest?.birthDate || selectedRequest.birthDate || ''}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, birthDate: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nationality">Nationaliteit</Label>
                    <Input
                      id="nationality"
                      value={editedRequest?.nationality || selectedRequest.nationality || ''}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, nationality: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#963E56] mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Contactgegevens
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedRequest?.email || selectedRequest.email}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, email: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      value={editedRequest?.phoneNumber || selectedRequest.phoneNumber}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, phoneNumber: e.target.value})}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="street">Straat</Label>
                    <Input
                      id="street"
                      value={editedRequest?.street || selectedRequest.street || ''}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, street: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="houseNumber">Huisnummer</Label>
                      <Input
                        id="houseNumber"
                        value={editedRequest?.houseNumber || selectedRequest.houseNumber || ''}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, houseNumber: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="busNumber">Bus</Label>
                      <Input
                        id="busNumber"
                        value={editedRequest?.busNumber || selectedRequest.busNumber || ''}
                        onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, busNumber: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="postalCode">Postcode</Label>
                    <Input
                      id="postalCode"
                      value={editedRequest?.postalCode || selectedRequest.postalCode || ''}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, postalCode: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">Gemeente</Label>
                    <Input
                      id="city"
                      value={editedRequest?.city || selectedRequest.city || ''}
                      onChange={(e) => setEditedRequest({...editedRequest || selectedRequest, city: e.target.value})}
                      className="mt-1"
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
                      value={editedRequest?.membershipType || selectedRequest.membershipType}
                      onValueChange={(value) => setEditedRequest({...editedRequest || selectedRequest, membershipType: value})}
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

              <div className="p-4 border border-[#963E56]/20 bg-[#963E56]/5 rounded-md mb-6">
                <h3 className="text-lg font-semibold text-[#963E56] mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
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
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
              <Button 
                variant="outline"
                className="gap-1"
                onClick={() => setShowDetailView(false)}
              >
                <ArrowLeft className="h-4 w-4" />
                Terug
              </Button>
              
              <div className="flex items-center gap-2">
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
                  {rejectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig...
                    </>
                  ) : (
                    <>
                      <XIcon className="mr-2 h-4 w-4" />
                      Afwijzen
                    </>
                  )}
                </Button>
                
                <Button 
                  className="bg-[#963E56] hover:bg-[#7d3447] text-white"
                  onClick={() => {
                    setShowDetailView(false);
                    handleApprove(editedRequest || selectedRequest);
                  }}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="mr-2 h-4 w-4" />
                      Goedkeuren
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}