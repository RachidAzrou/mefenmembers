import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Calendar as CalendarIcon, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  paymentMethod?: "cash" | "domiciliering" | "overschrijving" | "bancontact";
  paymentTerm?: "maandelijks" | "driemaandelijks" | "jaarlijks";
  autoRenew?: boolean;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  bicSwift?: string | null;
  rejectionReason?: string | null;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy", { locale: nl });
}

export default function MemberRequestDetail() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState<Partial<MemberRequest> | null>(null);
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

  // Fetch member request data
  const { data: request, isLoading, error } = useQuery({
    queryKey: ["/api/member-requests", Number(id)],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/member-requests?id=${id}`);
      const data = await res.json();
      return data as MemberRequest;
    },
    enabled: !!id,
  });
  
  // Update birthDate when request data is loaded
  useEffect(() => {
    if (request?.birthDate) {
      setBirthDate(new Date(request.birthDate));
    }
  }, [request]);

  // Update member request
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<MemberRequest>) => {
      const res = await apiRequest("PUT", "/api/member-requests/status", { 
        id: Number(id),
        ...data 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Wijzigingen opgeslagen",
        description: "De aanvraag is succesvol bijgewerkt.",
      });
      setIsEditing(false);
      setEditedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij opslaan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve member request
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/member-requests/approve", { 
        id: Number(id),
        processedBy: 1 // Hard-coded user ID, in a real app this would be the current user
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aanvraag goedgekeurd",
        description: "Het lidmaatschap is succesvol aangemaakt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      // Navigate back to the member requests page
      setLocation("/member-requests");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij goedkeuren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject member request
  const rejectMutation = useMutation({
    mutationFn: async (rejectionReason: string) => {
      const res = await apiRequest("PUT", "/api/member-requests/status", { 
        id: Number(id),
        status: "rejected",
        rejectionReason,
        processedBy: 1 // Hard-coded user ID
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aanvraag afgewezen",
        description: "De lidmaatschapsaanvraag is afgewezen.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/member-requests"] });
      // Navigate back to the member requests page
      setLocation("/member-requests");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij afwijzen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSave = () => {
    if (editedRequest) {
      // Include birthDate in the update if it was changed
      const updatedData: Partial<MemberRequest> = {
        ...editedRequest
      };
      
      if (birthDate && (!request?.birthDate || new Date(request.birthDate).getTime() !== birthDate.getTime())) {
        updatedData.birthDate = birthDate.toISOString();
      }
      
      updateMutation.mutate(updatedData);
    }
  };

  // Handle approve
  const handleApprove = () => {
    approveMutation.mutate();
  };

  // Handle reject (with confirmation dialog)
  const handleReject = (rejectionReason: string) => {
    rejectMutation.mutate(rejectionReason);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Fout bij het laden van de aanvraag</h1>
        <p className="text-gray-600 mb-6">{error ? error.message : "Aanvraag niet gevonden"}</p>
        <Button onClick={() => setLocation("/member-requests")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar aanvragen
        </Button>
      </div>
    );
  }

  const isProcessed = request.status === "approved" || request.status === "rejected";

  return (
    <div className="min-h-screen py-6 px-3 sm:py-8 sm:px-4 md:py-12 md:px-6 lg:px-8 pb-20 sm:pb-16" 
         style={{
           background: "url('/pattern.jpg') center/cover fixed no-repeat, linear-gradient(135deg, rgba(245, 247, 250, 0.7), rgba(195, 207, 226, 0.7))",
           backgroundBlendMode: "overlay"
         }}>
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white/95 shadow-xl rounded-xl overflow-hidden backdrop-blur-md">
          {/* Header in bordeauxrode stijl */}
          <div className="bg-[#963E56] p-5 sm:p-6 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20 hover:text-white px-3 -ml-3"
                onClick={() => setLocation("/member-requests")}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Terug
              </Button>
              <div className="flex items-center">
                {request.status === "pending" && (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-300">
                    In behandeling
                  </Badge>
                )}
                {request.status === "approved" && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-300">
                    Goedgekeurd
                  </Badge>
                )}
                {request.status === "rejected" && (
                  <Badge variant="outline" className="bg-red-500/20 text-red-700 border-red-300">
                    Afgewezen
                  </Badge>
                )}
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-2">
              Aanvraag van {request.firstName} {request.lastName}
            </h1>
            <p className="text-sm mt-1 opacity-80">
              Ingediend op {formatDate(request.requestDate)}
              {request.processedDate && ` • Verwerkt op ${formatDate(request.processedDate)}`}
            </p>
          </div>
          
          {/* Alleen weergeven bij afgewezen aanvragen */}
          {request.status === "rejected" && request.rejectionReason && (
            <div className="mx-4 sm:mx-6 mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
              <h3 className="font-medium text-red-800 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Reden voor afwijzing
              </h3>
              <p className="mt-2 text-gray-700">{request.rejectionReason}</p>
            </div>
          )}

          {/* Actiebuttons voor penderende aanvragen */}
          {request.status === "pending" && (
            <div className="flex justify-end gap-3 mx-6 my-4">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedRequest(null);
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    className="bg-[#963E56] hover:bg-[#7d3447] text-white"
                    onClick={handleSave}
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
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    onClick={() => {
                      const reason = prompt("Reden voor afwijzing:")
                      if (reason) handleReject(reason);
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
                        <XCircle className="mr-2 h-4 w-4" />
                        Afwijzen
                      </>
                    )}
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Bezig...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Goedkeuren
                      </>
                    )}
                  </Button>
                  <Button
                    variant="default"
                    className="bg-[#963E56] hover:bg-[#7d3447] text-white"
                    onClick={() => setIsEditing(true)}
                  >
                    Bewerken
                  </Button>
                </>
              )}
            </div>
          )}
          
          {/* Formulier */}
          <div className="p-4 sm:p-6">
            <div className="space-y-6 sm:space-y-8">
              
              {/* Sectie: Persoonsgegevens */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="h-8 w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-base">1</div>
                  <h2 className="text-lg sm:text-xl font-semibold">Persoonsgegevens</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  {/* Rij 1: Voornaam en Achternaam */}
                  <div>
                    <Label htmlFor="firstName" className="text-sm sm:text-base">
                      Voornaam <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={editedRequest?.firstName ?? request.firstName}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, firstName: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName" className="text-sm sm:text-base">
                      Naam <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={editedRequest?.lastName ?? request.lastName}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, lastName: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                  
                  {/* Rij 2: Geslacht en Geboortedatum */}
                  <div>
                    <Label htmlFor="gender" className="text-sm sm:text-base">
                      Geslacht <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={editedRequest?.gender ?? request.gender || ""}
                      onValueChange={(value) => setEditedRequest({ ...editedRequest || {}, gender: value })}
                      disabled={!isEditing || isProcessed}
                    >
                      <SelectTrigger id="gender" className="h-10">
                        <SelectValue placeholder="Selecteer geslacht" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="vrouw">Vrouw</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="birthDate" className="text-sm sm:text-base">
                      Geboortedatum <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-10 justify-start text-left font-normal",
                              !birthDate && "text-muted-foreground"
                            )}
                            disabled={!isEditing || isProcessed}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {birthDate ? format(birthDate, "dd/MM/yyyy", { locale: nl }) : <span>Selecteer datum</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={birthDate}
                            onSelect={setBirthDate}
                            initialFocus
                            disabled={(date) => date > new Date()}
                            locale={nl}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  {/* Nationaliteit */}
                  <div>
                    <Label htmlFor="nationality" className="text-sm sm:text-base">
                      Nationaliteit
                    </Label>
                    <Input
                      id="nationality"
                      value={editedRequest?.nationality ?? request.nationality || ""}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, nationality: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                </div>
              </div>
              
              {/* Sectie: Contactgegevens */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="h-8 w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-base">2</div>
                  <h2 className="text-lg sm:text-xl font-semibold">Contactgegevens</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <Label htmlFor="email" className="text-sm sm:text-base">
                      E-mailadres <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedRequest?.email ?? request.email}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, email: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phoneNumber" className="text-sm sm:text-base">
                      Telefoonnummer <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={editedRequest?.phoneNumber ?? request.phoneNumber}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, phoneNumber: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                  
                  {/* Adres */}
                  <div>
                    <Label htmlFor="street" className="text-sm sm:text-base">
                      Straat
                    </Label>
                    <Input
                      id="street"
                      value={editedRequest?.street ?? request.street || ""}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, street: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="houseNumber" className="text-sm sm:text-base">
                        Huisnummer
                      </Label>
                      <Input
                        id="houseNumber"
                        value={editedRequest?.houseNumber ?? request.houseNumber || ""}
                        onChange={(e) => setEditedRequest({ ...editedRequest || {}, houseNumber: e.target.value })}
                        className="mt-1 h-10"
                        disabled={!isEditing || isProcessed}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="busNumber" className="text-sm sm:text-base">
                        Bus
                      </Label>
                      <Input
                        id="busNumber"
                        value={editedRequest?.busNumber ?? request.busNumber || ""}
                        onChange={(e) => setEditedRequest({ ...editedRequest || {}, busNumber: e.target.value })}
                        className="mt-1 h-10"
                        disabled={!isEditing || isProcessed}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="postalCode" className="text-sm sm:text-base">
                      Postcode
                    </Label>
                    <Input
                      id="postalCode"
                      value={editedRequest?.postalCode ?? request.postalCode || ""}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, postalCode: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city" className="text-sm sm:text-base">
                      Gemeente
                    </Label>
                    <Input
                      id="city"
                      value={editedRequest?.city ?? request.city || ""}
                      onChange={(e) => setEditedRequest({ ...editedRequest || {}, city: e.target.value })}
                      className="mt-1 h-10"
                      disabled={!isEditing || isProcessed}
                    />
                  </div>
                </div>
              </div>
              
              {/* Sectie: Lidmaatschap */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="h-8 w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-base">3</div>
                  <h2 className="text-lg sm:text-xl font-semibold">Lidmaatschap</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <Label htmlFor="membershipType" className="text-sm sm:text-base">
                      Type lidmaatschap <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={editedRequest?.membershipType ?? request.membershipType}
                      onValueChange={(value) => setEditedRequest({ ...editedRequest || {}, membershipType: value as "standaard" | "student" | "senior" })}
                      disabled={!isEditing || isProcessed}
                    >
                      <SelectTrigger id="membershipType" className="h-10">
                        <SelectValue placeholder="Selecteer type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standaard">Standaard</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentMethod" className="text-sm sm:text-base">
                      Betaalwijze <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={editedRequest?.paymentMethod ?? request.paymentMethod || "overschrijving"}
                      onValueChange={(value) => setEditedRequest({ ...editedRequest || {}, paymentMethod: value as "cash" | "domiciliering" | "overschrijving" | "bancontact" })}
                      disabled={!isEditing || isProcessed}
                    >
                      <SelectTrigger id="paymentMethod" className="h-10">
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
                    <Label htmlFor="paymentTerm" className="text-sm sm:text-base">
                      Betalingstermijn <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={editedRequest?.paymentTerm ?? request.paymentTerm || "jaarlijks"}
                      onValueChange={(value) => setEditedRequest({ ...editedRequest || {}, paymentTerm: value as "maandelijks" | "driemaandelijks" | "jaarlijks" })}
                      disabled={!isEditing || isProcessed}
                    >
                      <SelectTrigger id="paymentTerm" className="h-10">
                        <SelectValue placeholder="Selecteer termijn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maandelijks">Maandelijks</SelectItem>
                        <SelectItem value="driemaandelijks">Driemaandelijks</SelectItem>
                        <SelectItem value="jaarlijks">Jaarlijks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2 h-10 mt-6">
                    <Label htmlFor="autoRenew" className="text-sm sm:text-base cursor-pointer">
                      Automatische verlenging
                    </Label>
                    <Switch
                      id="autoRenew"
                      checked={editedRequest?.autoRenew ?? request.autoRenew ?? true}
                      onCheckedChange={(checked) => setEditedRequest({ ...editedRequest || {}, autoRenew: checked })}
                      disabled={!isEditing || isProcessed}
                      className="data-[state=checked]:bg-[#963E56]"
                    />
                  </div>
                </div>
              </div>
              
              {/* Sectie: Bankgegevens (alleen weergeven bij domiciliëring) */}
              {((request.paymentMethod === "domiciliering") || (editedRequest?.paymentMethod === "domiciliering")) && (
                <div className="border border-gray-200 rounded-lg p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="h-8 w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-base">4</div>
                    <h2 className="text-lg sm:text-xl font-semibold">Bankgegevens</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div>
                      <Label htmlFor="accountNumber" className="text-sm sm:text-base">
                        IBAN Rekeningnummer <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="accountNumber"
                        value={editedRequest?.accountNumber ?? request.accountNumber || ""}
                        onChange={(e) => setEditedRequest({ ...editedRequest || {}, accountNumber: e.target.value })}
                        className="mt-1 h-10"
                        disabled={!isEditing || isProcessed}
                        placeholder="bijv. BE68 5390 0754 7034"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="accountHolderName" className="text-sm sm:text-base">
                        Naam rekeninghouder
                      </Label>
                      <Input
                        id="accountHolderName"
                        value={editedRequest?.accountHolderName ?? request.accountHolderName || ""}
                        onChange={(e) => setEditedRequest({ ...editedRequest || {}, accountHolderName: e.target.value })}
                        className="mt-1 h-10"
                        disabled={!isEditing || isProcessed}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bicSwift" className="text-sm sm:text-base">
                        BIC/SWIFT Code
                      </Label>
                      <Input
                        id="bicSwift"
                        value={editedRequest?.bicSwift ?? request.bicSwift || ""}
                        onChange={(e) => setEditedRequest({ ...editedRequest || {}, bicSwift: e.target.value })}
                        className="mt-1 h-10"
                        disabled={!isEditing || isProcessed}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Sectie: Opmerkingen */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="h-8 w-8 rounded-full bg-[#963E56] text-white flex items-center justify-center font-semibold text-base">
                    {((request.paymentMethod === "domiciliering") || (editedRequest?.paymentMethod === "domiciliering")) ? "5" : "4"}
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold">Opmerkingen</h2>
                </div>
                
                <div>
                  <Textarea
                    id="notes"
                    value={editedRequest?.notes ?? request.notes || ""}
                    onChange={(e) => setEditedRequest({ ...editedRequest || {}, notes: e.target.value })}
                    placeholder="Extra informatie of opmerkingen"
                    className="min-h-[120px]"
                    disabled={!isEditing || isProcessed}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}