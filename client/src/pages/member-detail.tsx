import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { 
  User, Phone, CreditCard, ArrowLeft, Edit,
  Check, X, CircleUser, Award, Banknote
} from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "Onbekend";
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
}

export default function MemberDetail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Parse member ID from URL - behandel als string omdat Firebase string IDs gebruikt
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id') || undefined;
  
  // Fetch all members
  const { data: members = [], isLoading, error } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Find the current member from the list - gebruik strict equality (===) voor strings
  const member = members.find(m => String(m.id) === String(memberId));
  
  // Calculate age function
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
  
  // Function to calculate membership years
  const calculateMembershipYears = (member: Member): number => {
    if (!member) return 0;
    
    // Use startDate if available, otherwise registrationDate
    const membershipDate = member.startDate || member.registrationDate;
    if (!membershipDate) return 0;
    
    const today = new Date();
    const startDate = new Date(membershipDate);
    let years = today.getFullYear() - startDate.getFullYear();
    
    // Check if the member's "anniversary" has passed this year
    if (
      today.getMonth() < startDate.getMonth() || 
      (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate())
    ) {
      years--;
    }
    
    return Math.max(0, years);
  };
  
  // Determine if a member is eligible for voting
  const isVotingEligible = (member: Member): boolean => {
    // Requirement 1: Adult (18+)
    const age = calculateAge(member.birthDate);
    if (!age || age < 18) return false;
    
    // Requirement 2: Minimum 5 consecutive years of membership
    const membershipYears = calculateMembershipYears(member);
    if (membershipYears < 5) return false;
    
    // Requirement 3: Has paid
    if (!member.paymentStatus) return false;
    
    // All requirements met
    return true;
  };
  
  useEffect(() => {
    // Show error toast if no member found after loading
    if (!isLoading && !member && memberId) {
      toast({
        title: "Fout bij laden",
        description: "Kon de gegevens van dit lid niet vinden.",
        variant: "destructive"
      });
      navigate("/members");
    }
  }, [isLoading, member, memberId, navigate, toast]);
  
  // Handle back button click
  const handleBack = () => {
    navigate("/members");
  };
  
  // Handle edit button click
  const handleEdit = () => {
    if (member?.id) {
      navigate(`/member-add?id=${member.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md">
          <Skeleton className="h-8 w-64 bg-white/30 mb-2" />
          <Skeleton className="h-4 w-48 bg-white/20" />
        </div>
        <Card className="border-none shadow-md">
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
              <div>
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!member) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              Lid niet gevonden
            </h1>
            <p className="text-white/80">
              Het opgevraagde lid bestaat niet of is verwijderd
            </p>
          </div>
        </div>
        <Card className="border-none shadow-md flex items-center justify-center p-12">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold mb-2">Geen gegevens beschikbaar</h2>
            <p className="text-gray-500 mb-6">We konden geen informatie vinden over dit lid.</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar ledenlijst
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section met gradient achtergrond */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/90 to-[#963E56] p-6 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
              {member.firstName} {member.lastName}
            </h1>
            {isVotingEligible(member) && (
              <Badge className="bg-white/90 text-[#963E56] hover:bg-white text-xs font-semibold">
                <Award className="h-3 w-3 mr-1" />
                Stemgerechtigd
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-white/90">
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-1.5 opacity-80" />
              <span>Lid #{member.memberNumber.toString().padStart(4, '0')}</span>
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1.5 opacity-80" />
              <span>
                {calculateAge(member.birthDate) 
                  ? `${calculateAge(member.birthDate)} jaar` 
                  : "Leeftijd onbekend"}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Knoppen onder de header */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBack}
          className="border-[#963E56]/20 text-[#963E56] hover:bg-[#963E56]/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar ledenlijst
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleEdit}
          className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
        >
          <Edit className="mr-2 h-4 w-4" />
          Bewerken
        </Button>
      </div>
      
      {/* Informatie sectie met verbeterde layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Persoonlijke gegevens kaart */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-[#963E56]/5 pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-[#963E56]">
              <User className="h-5 w-5" />
              Persoonlijke gegevens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">Volledige naam</div>
                <div className="font-medium text-gray-900 mt-1">{member.firstName} {member.lastName}</div>
              </div>
              
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">Geboortedatum</div>
                <div className="font-medium text-gray-900 mt-1">
                  {formatDate(member.birthDate)}
                  {calculateAge(member.birthDate) && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({calculateAge(member.birthDate)} jaar)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">Geslacht</div>
                <div className="font-medium text-gray-900 mt-1 flex items-center">
                  {member.gender === "man" ? (
                    <>
                      <User className="h-4 w-4 mr-1.5 text-blue-500" />
                      <span>Man</span>
                    </>
                  ) : member.gender === "vrouw" ? (
                    <>
                      <CircleUser className="h-4 w-4 mr-1.5 text-pink-500" />
                      <span>Vrouw</span>
                    </>
                  ) : "Niet opgegeven"}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Nationaliteit</div>
                <div className="font-medium text-gray-900 mt-1">{member.nationality || "Niet opgegeven"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Contactgegevens kaart */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-blue-50 pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
              <Phone className="h-5 w-5" />
              Contactgegevens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">Telefoon</div>
                <div className="font-medium text-gray-900 mt-1">{formatPhoneNumber(member.phoneNumber)}</div>
              </div>
              
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">E-mail</div>
                <div className="font-medium text-gray-900 mt-1 break-all">{member.email || "Niet opgegeven"}</div>
              </div>
              
              {(member.street || member.postalCode || member.city) && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Adres</div>
                  <div className="font-medium text-gray-900 mt-1">
                    {member.street && `${member.street} ${member.houseNumber || ""} ${member.busNumber || ""}`}
                    {(member.postalCode || member.city) && (
                      <div>{member.postalCode} {member.city}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Lidmaatschap & Financiële gegevens kaart */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-amber-50 pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
              <Banknote className="h-5 w-5" />
              Lidmaatschap & Financiën
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">Lidmaatschapstype</div>
                <div className="font-medium text-gray-900 mt-1">
                  {member.membershipType === "standaard" ? "Standaard" :
                   member.membershipType === "student" ? "Student" :
                   member.membershipType === "senior" ? "Senior" : "Onbekend"}
                </div>
              </div>
              
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">Lidmaatschap</div>
                <div className="font-medium text-gray-900 mt-1">
                  <div>Start: {formatDate(member.startDate)}</div>
                  <div className="text-sm text-gray-600 mt-1">Duur: {calculateMembershipYears(member)} jaar</div>
                </div>
              </div>
              
              <div className="border-b border-gray-100 pb-3">
                <div className="text-sm font-medium text-gray-500">Betalingsdetails</div>
                <div className="font-medium text-gray-900 mt-1">
                  <div className="flex items-center">
                    <span className="w-32">Methode:</span>
                    <span>
                      {member.paymentMethod === "cash" ? "Contant" :
                      member.paymentMethod === "domiciliering" ? "Domiciliëring" :
                      member.paymentMethod === "overschrijving" ? "Overschrijving" :
                      member.paymentMethod === "bancontact" ? "Bancontact" : "Onbekend"}
                    </span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="w-32">Termijn:</span>
                    <span>
                      {member.paymentTerm === "jaarlijks" ? "Jaarlijks" :
                      member.paymentTerm === "maandelijks" ? "Maandelijks" :
                      member.paymentTerm === "driemaandelijks" ? "Driemaandelijks" : "Onbekend"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Betaalstatus</div>
                <div className="mt-2">
                  <Badge className={`px-3 py-1 ${
                    member.paymentStatus 
                      ? "bg-green-100 text-green-800 hover:bg-green-200" 
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }`}>
                    {member.paymentStatus 
                      ? <><Check className="h-3.5 w-3.5 mr-1.5" /> Betaald</> 
                      : <><X className="h-3.5 w-3.5 mr-1.5" /> Niet betaald</>}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Notities sectie verwijderd op verzoek */}
    </div>
  );
}