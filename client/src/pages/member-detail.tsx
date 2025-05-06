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
  
  // Parse member ID from URL
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id') ? parseInt(params.get('id')!) : undefined;
  
  // Fetch all members
  const { data: members = [], isLoading, error } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Find the current member from the list
  const member = members.find(m => m.id === memberId);
  
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
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
          <div className="flex mt-4 sm:mt-0 space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBack}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEdit}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              <Edit className="mr-2 h-4 w-4" />
              Bewerken
            </Button>
          </div>
        </div>
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 flex items-center">
                <User className="h-5 w-5 mr-2 text-[#963E56]" /> 
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-[#963E56]" /> 
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
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-[#963E56]" /> 
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3">
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