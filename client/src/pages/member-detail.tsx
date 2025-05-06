import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { User, Phone, CreditCard, ArrowLeft, Edit } from "lucide-react";
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
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center">
            {member.firstName} {member.lastName}
            {isVotingEligible(member) && (
              <Badge className="ml-2 bg-white/80 text-[#963E56] hover:bg-white text-xs">
                Stemgerechtigd
              </Badge>
            )}
          </h1>
          <p className="text-white/80">
            Lidnummer: {member.memberNumber.toString().padStart(4, '0')}
          </p>
        </div>
      </div>
      
      {/* Knoppen onder de header */}
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBack}
          className="border-[#963E56]/20 text-[#963E56] hover:bg-[#963E56]/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleEdit}
          className="border-[#963E56]/20 text-[#963E56] hover:bg-[#963E56]/10"
        >
          <Edit className="mr-2 h-4 w-4" />
          Bewerken
        </Button>
      </div>
      
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Lidgegevens</CardTitle>
          <CardDescription>
            Volledige informatie over het lid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-3 flex items-center">
                <div className="mr-2 bg-[#963E56]/10 p-1.5 sm:p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#963E56]">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                Persoonlijke gegevens
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Naam</div>
                  <div className="font-medium">{member.firstName} {member.lastName}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Geboortedatum</div>
                  <div className="font-medium">{formatDate(member.birthDate)}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Geslacht</div>
                  <div className="font-medium">
                    {member.gender === "man" ? "Man" : 
                     member.gender === "vrouw" ? "Vrouw" : "Niet opgegeven"}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Nationaliteit</div>
                  <div className="font-medium">{member.nationality || "Niet opgegeven"}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-3 flex items-center">
                <div className="mr-2 bg-blue-50 p-1.5 sm:p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                Contactgegevens
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Telefoon</div>
                  <div className="font-medium">{formatPhoneNumber(member.phoneNumber)}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">E-mail</div>
                  <div className="font-medium">{member.email || "Niet opgegeven"}</div>
                </div>
                
                {(member.street || member.postalCode || member.city) && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">Adres</div>
                    <div className="font-medium">
                      {member.street && `${member.street} ${member.houseNumber || ""} ${member.busNumber || ""}`}
                      {(member.postalCode || member.city) && (
                        <div>{member.postalCode} {member.city}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-3 flex items-center">
              <div className="mr-2 bg-amber-50 p-1.5 sm:p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              Lidmaatschap & Betaalgegevens
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Lidmaatschapstype</div>
                  <div className="font-medium">
                    {member.membershipType === "standaard" ? "Standaard" :
                     member.membershipType === "student" ? "Student" :
                     member.membershipType === "senior" ? "Senior" : "Onbekend"}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Startdatum lidmaatschap</div>
                  <div className="font-medium">{formatDate(member.startDate)}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Lidmaatschapsduur</div>
                  <div className="font-medium">{calculateMembershipYears(member)} jaar</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Betalingsmethode</div>
                  <div className="font-medium">
                    {member.paymentMethod === "cash" ? "Contant" :
                     member.paymentMethod === "domiciliering" ? "Domiciliëring" :
                     member.paymentMethod === "overschrijving" ? "Overschrijving" :
                     member.paymentMethod === "bancontact" ? "Bancontact" : "Onbekend"}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Betalingstermijn</div>
                  <div className="font-medium">
                    {member.paymentTerm === "jaarlijks" ? "Jaarlijks" :
                     member.paymentTerm === "maandelijks" ? "Maandelijks" :
                     member.paymentTerm === "driemaandelijks" ? "Driemaandelijks" : "Onbekend"}
                  </div>
                </div>
                
                <div className="flex p-3 rounded-lg bg-gray-50 gap-3">
                  <div className={`p-2 rounded-full ${member.paymentStatus ? 'bg-green-100' : 'bg-red-100'}`}>
                    {member.paymentStatus ? (
                      <div className="h-4 w-4 text-green-600">✓</div>
                    ) : (
                      <div className="h-4 w-4 text-red-600">✗</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Betaalstatus</div>
                    <div className="font-medium">
                      {member.paymentStatus ? "Betaald" : "Niet betaald"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {member.notes && (
            <div className="mt-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-3 flex items-center">
                <div className="mr-2 bg-gray-100 p-1.5 sm:p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                    <path d="M9 9h1" />
                    <path d="M9 13h6" />
                    <path d="M9 17h6" />
                  </svg>
                </div>
                Notities
              </h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="whitespace-pre-wrap">{member.notes}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}