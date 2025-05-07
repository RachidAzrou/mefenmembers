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
        <div className="mt-4 md:mt-0 flex gap-2 ml-auto">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-[#963E56]">
              <CheckIcon className="h-5 w-5" />
              Lidmaatschapsaanvraag goedkeuren
            </DialogTitle>
            <DialogDescription>
              Je staat op het punt om de aanvraag van <span className="font-medium">{selectedRequest?.firstName} {selectedRequest?.lastName}</span> goed te keuren.
              Dit zal automatisch een nieuw lid aanmaken met de gegevens uit deze aanvraag.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-[#963E56]/5 border border-[#963E56]/20 rounded-md p-4 my-4">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#963E56]">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <h3 className="font-medium text-[#963E56]">Lidmaatschapsgegevens</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Het volgende lidnummer wordt toegewezen: <span className="font-bold">{nextMemberNumber || "..."}</span>
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Naam</p>
                <p className="font-medium truncate">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Type lidmaatschap</p>
                <p className="capitalize truncate">{selectedRequest?.membershipType}</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Betaalstatus</p>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
                  Moet nog betalen
                </Badge>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">E-mail</p>
                <p className="truncate">{selectedRequest?.email}</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Telefoonnummer</p>
                <p className="truncate">{selectedRequest?.phoneNumber}</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Betaaltermijn</p>
                <p className="truncate">Jaarlijks</p>
              </div>
            </div>
            
            <div className="mt-4 text-sm">
              <p className="text-gray-600">
                <strong>Belangrijk:</strong> Na goedkeuring wordt het nieuwe lid aangemaakt met betaalstatus "Niet betaald". 
                Je kunt de betaalstatus later bijwerken op de ledenpagina.
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Annuleren
            </Button>
            <Button 
              className="bg-[#963E56] hover:bg-[#7d3447] text-white"
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
        </DialogContent>
      </Dialog>

      {/* Afwijzings dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-[#963E56]">
              <XIcon className="h-5 w-5" />
              Lidmaatschapsaanvraag afwijzen
            </DialogTitle>
            <DialogDescription>
              Je staat op het punt om de aanvraag van <span className="font-medium">{selectedRequest?.firstName} {selectedRequest?.lastName}</span> af te wijzen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-[#963E56]/5 border border-[#963E56]/20 rounded-md p-4 my-4">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#963E56]">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <h3 className="font-medium text-[#963E56]">Reden voor afwijzing</h3>
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">
                Geef een duidelijke reden voor de afwijzing. Deze informatie is alleen voor intern gebruik.
              </p>
              <Textarea 
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Beschrijf waarom deze aanvraag is afgewezen..."
                className="min-h-[120px] w-full border-gray-300"
              />
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Naam</p>
                <p className="font-medium truncate">{selectedRequest?.firstName} {selectedRequest?.lastName}</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Type lidmaatschap</p>
                <p className="capitalize truncate">{selectedRequest?.membershipType}</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">E-mail</p>
                <p className="truncate">{selectedRequest?.email}</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-xs font-medium text-gray-500">Aanvraagdatum</p>
                <p className="truncate">{selectedRequest?.requestDate ? formatDate(selectedRequest.requestDate) : 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Annuleren
            </Button>
            <Button 
              className="bg-[#963E56] hover:bg-[#7d3447] text-white"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}