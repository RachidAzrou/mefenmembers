import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, Download, UserPlus, CalendarDays, 
  CreditCard, TrendingUp, Percent, UserCheck,
  Baby, GraduationCap, UserRound, Heart, BarChart3,
  PieChart, Briefcase, School, PersonStanding, Gamepad2,
  Accessibility, Leaf, MountainSnow, 
  Snowflake, UserCog, UserX, Smartphone,
  Backpack, BookOpen, Banknote, Glasses,
  CircleUser, User
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Member } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  // State voor filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  
  // Haal alle leden op
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Filter leden op basis van betalingsstatus
  const filteredMembers = members.filter(member => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paid') return member.paymentStatus;
    if (statusFilter === 'unpaid') return !member.paymentStatus;
    return true;
  });

  // Tel het aantal leden dat betaald heeft
  const paidMembers = members.filter(member => member.paymentStatus).length;
  const unpaidMembers = members.length - paidMembers;
  
  // Exporteer ledenlijst naar Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(members.map(member => ({
      "Lidnummer": member.memberNumber,
      "Voornaam": member.firstName,
      "Achternaam": member.lastName,
      "Geboortedatum": member.birthDate ? new Date(member.birthDate).toLocaleDateString() : "",
      "E-mail": member.email || "",
      "Telefoonnummer": member.phoneNumber || "",
      "Rekeningnummer": member.accountNumber || "",
      "Betaalstatus": member.paymentStatus ? "Betaald" : "Niet betaald",
      "Registratiedatum": new Date(member.registrationDate).toLocaleDateString(),
      "Notities": member.notes || ""
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leden");
    
    // Genereer bestandsnaam met datum
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ledenlijst_${date}.xlsx`);
  };
  
  // Bereken betaalpercentage
  const paymentPercentage = members.length > 0
    ? Math.round((paidMembers / members.length) * 100)
    : 0;
    
  // Haal de meest recente registratie op
  const mostRecentRegistration = members.length > 0
    ? new Date(Math.max(...members.map(m => new Date(m.registrationDate).getTime())))
    : null;
    
  // Bereken leeftijdsstatistieken
  const calculateAge = (birthDate: string | null) => {
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
  
  // Leeftijdscategorieën
  const teenagers = members.filter(m => {
    const age = calculateAge(m.birthDate);
    return age !== null && age >= 13 && age <= 17;
  }).length;
  
  const youngAdults = members.filter(m => {
    const age = calculateAge(m.birthDate);
    return age !== null && age >= 18 && age <= 24;
  }).length;
  
  const adults = members.filter(m => {
    const age = calculateAge(m.birthDate);
    return age !== null && age >= 25 && age <= 64;
  }).length;
  
  const elderly = members.filter(m => {
    const age = calculateAge(m.birthDate);
    return age !== null && age >= 65;
  }).length;
  
  // Behandel klikken op widgets als toggle
  const handleStatusFilterChange = (filter: 'all' | 'paid' | 'unpaid') => {
    // Als dezelfde filter al actief is, schakel terug naar 'all'
    if (statusFilter === filter) {
      setStatusFilter('all');
    } else {
      setStatusFilter(filter);
    }
  };
    
  return (
    <div className="space-y-8">
      {/* Header section met gradient achtergrond */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              Dashboard
            </h1>
            <p className="text-white/80">
              Overzicht van de ledenadministratie van Moskee MEFEN
            </p>
          </div>
        </div>
      </div>

      {/* Hier stonden voorheen de statistiek widgets die zijn verwijderd */}

      {/* 1. Ledenoverzicht widget */}
      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-[#963E56]" />
              Ledenoverzicht
            </CardTitle>
            <CardDescription>
              Status van de leden
            </CardDescription>
          </div>
          
          {/* Filter indicator verwijderd zoals gevraagd */}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statusFilter !== 'all' && (
              <div className="flex justify-between items-center">
                {statusFilter === 'paid' && (
                  <>
                    <span className="text-sm font-medium">{paymentPercentage}% betaald</span>
                    <span className="text-sm text-muted-foreground">{paidMembers} van {members.length} leden</span>
                  </>
                )}
                {statusFilter === 'unpaid' && (
                  <>
                    <span className="text-sm font-medium">{100-paymentPercentage}% niet betaald</span>
                    <span className="text-sm text-muted-foreground">{unpaidMembers} van {members.length} leden</span>
                  </>
                )}
              </div>
            )}
            {statusFilter !== 'all' && (
              <Progress 
                value={statusFilter === 'paid' ? paymentPercentage : (statusFilter === 'unpaid' ? (100-paymentPercentage) : 0)} 
                className="h-2" />
            )}
            
            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              {/* Totaal leden widget - komt als eerste */}
              <div
                className={cn(
                  "bg-blue-50 py-3 px-4 rounded-lg transition-all duration-150",
                  statusFilter === 'all' ? "ring-2 ring-blue-300" : ""
                )}
              >
                <div className="text-blue-600 font-semibold flex justify-center items-center">
                  <Users className="h-4 w-4 mr-1.5" />
                  {members.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Totaal</div>

              </div>
              
              {/* Betaald widget - komt als tweede */}
              <button
                onClick={() => handleStatusFilterChange('paid')}
                className={cn(
                  "bg-green-50 py-3 px-4 rounded-lg transition-all duration-150",
                  statusFilter === 'paid' ? "ring-2 ring-green-300" : "hover:bg-green-100"
                )}
              >
                <div className="text-green-600 font-semibold flex justify-center items-center">
                  <Banknote className="h-4 w-4 mr-1.5" />
                  {paidMembers}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Betaald</div>

              </button>
              
              {/* Niet betaald widget - komt als derde */}
              <button
                onClick={() => handleStatusFilterChange('unpaid')}
                className={cn(
                  "bg-red-50 py-3 px-4 rounded-lg transition-all duration-150",
                  statusFilter === 'unpaid' ? "ring-2 ring-red-300" : "hover:bg-red-100"
                )}
              >
                <div className="text-red-600 font-semibold flex justify-center items-center">
                  <div className="relative mr-1.5">
                    <Banknote className="h-4 w-4" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-0.5 bg-red-600 rotate-45 transform origin-center"></div>
                    </div>
                  </div>
                  {unpaidMembers}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Niet betaald</div>

              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 2. Lidmaatschapstype statistieken */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 h-2" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-amber-600" />
            Lidmaatschapstype
          </CardTitle>
          <CardDescription>
            Verdeling op basis van lidmaatschapstype
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {/* Standaard lidmaatschap */}
                <Link href="/members?type=standaard">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="bg-amber-100 p-3 rounded-full">
                      <UserCheck className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Standaard lidmaatschap</div>
                      <div className="flex justify-between items-center">
                        <div className="font-medium">
                          {members.filter(m => m.membershipType === 'standaard' || m.membershipType === null || m.membershipType === undefined).length} leden
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {Math.round((members.filter(m => m.membershipType === 'standaard' || m.membershipType === null || m.membershipType === undefined).length / members.length) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* Student lidmaatschap */}
                <Link href="/members?type=student">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="bg-green-100 p-3 rounded-full">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Student lidmaatschap</div>
                      <div className="flex justify-between items-center">
                        <div className="font-medium">
                          {members.filter(m => m.membershipType === 'student').length} leden
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {Math.round((members.filter(m => m.membershipType === 'student').length / members.length) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* Senior lidmaatschap */}
                <Link href="/members?type=senior">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <Glasses className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Senior lidmaatschap</div>
                      <div className="flex justify-between items-center">
                        <div className="font-medium">
                          {members.filter(m => m.membershipType === 'senior').length} leden
                        </div>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {Math.round((members.filter(m => m.membershipType === 'senior').length / members.length) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 3. Stemgerechtigden statistieken */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#963E56]/20 to-[#963E56] h-2" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCheck className="h-5 w-5 mr-2 text-[#963E56]" />
            Stemgerechtigden
          </CardTitle>
          <CardDescription>
            Leden die stemgerechtigd zijn (meerderjarig + 5 jaar lid + betaald)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <>
                {/* Stemgerechtigden statistieken */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#963E56]/20 p-3 rounded-full">
                      <UserCheck className="h-5 w-5 text-[#963E56]" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Stemgerechtigde leden</div>
                      <div className="font-medium">
                        {members.filter(member => {
                          // Voorwaarde 1: Meerderjarig (18+)
                          const age = calculateAge(member.birthDate);
                          if (!age || age < 18) return false;
                          
                          // Voorwaarde 2: Minstens 5 jaar aaneensluitend lid
                          const today = new Date();
                          // Gebruik startDate in plaats van registrationDate voor het berekenen van lidmaatschapsjaren
                          const startDate = new Date(member.startDate || member.registrationDate);
                          let years = today.getFullYear() - startDate.getFullYear();
                          
                          // Controleer of de 'verjaardag' van het lidmaatschap al is gepasseerd dit jaar
                          if (
                            today.getMonth() < startDate.getMonth() || 
                            (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate())
                          ) {
                            years--;
                          }
                          
                          if (years < 5) return false;
                          
                          // Voorwaarde 3: Elk jaar betaald
                          // Omdat we nog geen betalingsgeschiedenis bijhouden, gebruiken we de huidige betalingsstatus
                          if (!member.paymentStatus) return false;
                          
                          // Aan alle voorwaarden voldaan
                          return true;
                        }).length} leden
                      </div>
                    </div>
                  </div>
                  <Link href="/members?voting=true">
                    <Button size="sm" variant="outline" className="border-[#963E56] text-[#963E56] hover:bg-[#963E56]/10">
                      Toon lijst
                    </Button>
                  </Link>
                </div>
                
                {/* Voortgangsindicator voor stemgerechtigden */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {Math.round((members.filter(member => {
                        // Voorwaarde 1: Meerderjarig (18+)
                        const age = calculateAge(member.birthDate);
                        if (!age || age < 18) return false;
                        
                        // Voorwaarde 2: Minstens 5 jaar aaneensluitend lid
                        const today = new Date();
                        // Gebruik startDate in plaats van registrationDate voor het berekenen van lidmaatschapsjaren
                        const startDate = new Date(member.startDate || member.registrationDate);
                        let years = today.getFullYear() - startDate.getFullYear();
                        
                        // Controleer of het lidmaatschap lang genoeg is
                        if (
                          today.getMonth() < startDate.getMonth() || 
                          (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate())
                        ) {
                          years--;
                        }
                        
                        if (years < 5) return false;
                        
                        // Voorwaarde 3: Betaald
                        if (!member.paymentStatus) return false;
                        
                        return true;
                      }).length / members.length) * 100)}% van totaal
                    </span>
                  </div>
                  <Progress 
                    value={Math.round((members.filter(member => {
                      // Dezelfde voorwaarden als hierboven
                      const age = calculateAge(member.birthDate);
                      if (!age || age < 18) return false;
                      
                      const today = new Date();
                      // Gebruik startDate in plaats van registrationDate voor het berekenen van lidmaatschapsjaren
                      const startDate = new Date(member.startDate || member.registrationDate);
                      let years = today.getFullYear() - startDate.getFullYear();
                      
                      if (
                        today.getMonth() < startDate.getMonth() || 
                        (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate())
                      ) {
                        years--;
                      }
                      
                      if (years < 5) return false;
                      if (!member.paymentStatus) return false;
                      
                      return true;
                    }).length / members.length) * 100)} 
                    className="h-2" 
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 4. Geslacht statistieken */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Geslacht
          </CardTitle>
          <CardDescription>
            Verdeling van leden op basis van geslacht
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mannen */}
                <Link href="/members?gender=man">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Mannen</div>
                      <div className="font-medium">
                        {members.filter(m => m.gender === 'man').length} leden
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* Vrouwen */}
                <Link href="/members?gender=vrouw">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="bg-pink-100 p-3 rounded-full">
                      <CircleUser className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Vrouwen</div>
                      <div className="font-medium">
                        {members.filter(m => m.gender === 'vrouw').length} leden
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}