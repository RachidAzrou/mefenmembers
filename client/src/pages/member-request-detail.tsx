import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";

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

  // Approve member request
  const approveMutation = useMutation({
    mutationFn: async () => {
      // Volledige aanvraaggegevens meesturen voor maximale compatibiliteit
      // tussen lokale en Vercel-omgeving
      if (!request) throw new Error("Aanvraag data is niet beschikbaar");
      
      // Cast naar een type waarbij alle velden optioneel zijn zodat delete werkt
      const fullRequestData: Record<string, any> = {
        ...request,
        processedBy: 1 // Hard-coded user ID
      };
      
      // Verwijder velden die niet meegestuurd moeten worden om conflicten te voorkomen
      if ('processedDate' in fullRequestData) delete fullRequestData.processedDate;
      if ('memberId' in fullRequestData) delete fullRequestData.memberId;
      if ('memberNumber' in fullRequestData) delete fullRequestData.memberNumber;
      
      // Zowel ID in query als volledige data in body meesturen
      const res = await apiRequest("POST", `/api/member-requests/approve?id=${request.id}`, fullRequestData);
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
      // Volledige aanvraaggegevens meesturen voor maximale compatibiliteit
      if (!request) throw new Error("Aanvraag data is niet beschikbaar");
      
      // Cast naar een type waarbij alle velden optioneel zijn zodat delete werkt
      const fullRequestData: Record<string, any> = {
        ...request,
        status: "rejected",
        rejectionReason,
        notes: rejectionReason, // Dubbele opname voor compatibiliteit
        processedBy: 1 // Hard-coded user ID
      };
      
      // Verwijder velden die niet meegestuurd moeten worden om conflicten te voorkomen
      if ('processedDate' in fullRequestData) delete fullRequestData.processedDate;
      if ('memberId' in fullRequestData) delete fullRequestData.memberId;
      if ('memberNumber' in fullRequestData) delete fullRequestData.memberNumber;
      
      const res = await apiRequest("PUT", `/api/member-requests/status?id=${request.id}`, fullRequestData);
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

  const handleApprove = () => {
    approveMutation.mutate();
  };

  const handleReject = () => {
    const reason = prompt("Reden voor afwijzing:");
    if (reason) rejectMutation.mutate(reason);
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
                  <Badge variant="outline" className="bg-white text-[#963E56] border-white font-medium">
                    In behandeling
                  </Badge>
                )}
                {request.status === "approved" && (
                  <Badge variant="outline" className="bg-white text-green-600 border-white font-medium">
                    Goedgekeurd
                  </Badge>
                )}
                {request.status === "rejected" && (
                  <Badge variant="outline" className="bg-white text-rose-600 border-white font-medium">
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

          {/* Actiebuttons zijn verwijderd */}
          
          {/* Formulier (alleen weergeven, niet bewerken) */}
          <div className="p-4 sm:p-6">
            <div className="space-y-6 sm:space-y-8">
              {/* Persoonsgegevens */}
              <Card className="p-4 sm:p-6 border-gray-200 shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-[#963E56] mb-4">
                  Persoonsgegevens
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Naam</p>
                    <p className="mt-1">{request.firstName} {request.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Geslacht</p>
                    <p className="mt-1">{request.gender === "man" ? "Man" : request.gender === "vrouw" ? "Vrouw" : "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Geboortedatum</p>
                    <p className="mt-1">{formatDate(request.birthDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nationaliteit</p>
                    <p className="mt-1">{request.nationality || "-"}</p>
                  </div>
                </div>
              </Card>

              {/* Contactgegevens */}
              <Card className="p-4 sm:p-6 border-gray-200 shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-[#963E56] mb-4">
                  Contactgegevens
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">E-mailadres</p>
                    <p className="mt-1">{request.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefoonnummer</p>
                    <p className="mt-1">{request.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adres</p>
                    <p className="mt-1">
                      {request.street ? (
                        <>
                          {request.street} {request.houseNumber}
                          {request.busNumber ? ` bus ${request.busNumber}` : ""}<br />
                          {request.postalCode} {request.city}
                        </>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Lidmaatschap */}
              <Card className="p-4 sm:p-6 border-gray-200 shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-[#963E56] mb-4">
                  Lidmaatschapsgegevens
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type lidmaatschap</p>
                    <p className="mt-1">
                      {request.membershipType === "standaard" ? "Standaard" : 
                       request.membershipType === "student" ? "Student" : 
                       request.membershipType === "senior" ? "Senior" : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Betaalwijze</p>
                    <p className="mt-1">
                      {request.paymentMethod === "cash" ? "Cash" : 
                       request.paymentMethod === "bancontact" ? "Bancontact" : 
                       request.paymentMethod === "overschrijving" ? "Overschrijving" : 
                       request.paymentMethod === "domiciliering" ? "Domiciliëring" : "Overschrijving (standaard)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Betalingstermijn</p>
                    <p className="mt-1">
                      {request.paymentTerm === "maandelijks" ? "Maandelijks" : 
                       request.paymentTerm === "driemaandelijks" ? "Driemaandelijks" : 
                       request.paymentTerm === "jaarlijks" ? "Jaarlijks" : "Jaarlijks (standaard)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Automatisch verlengen</p>
                    <p className="mt-1">
                      {request.autoRenew === true ? "Ja" : 
                       request.autoRenew === false ? "Nee" : 
                       "Ja (standaard)"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Bankgegevens (alleen weergeven bij domiciliëring) */}
              {request.paymentMethod === "domiciliering" && (
                <Card className="p-4 sm:p-6 border-gray-200 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#963E56] mb-4">
                    Bankgegevens
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">IBAN Rekeningnummer</p>
                      <p className="mt-1">{request.accountNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Naam rekeninghouder</p>
                      <p className="mt-1">{request.accountHolderName || "-"}</p>
                    </div>
                    {request.bicSwift && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">BIC/SWIFT Code</p>
                        <p className="mt-1">{request.bicSwift}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Opmerkingen */}
              {request.notes && (
                <Card className="p-4 sm:p-6 border-gray-200 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#963E56] mb-4">
                    Opmerkingen
                  </h2>
                  <p className="whitespace-pre-wrap">{request.notes}</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}