import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, Check, X, Download, UserPlus, CalendarDays, 
  CreditCard, TrendingUp, Percent, UserCheck 
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

export default function Dashboard() {
  // Haal alle leden op
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
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
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={exportToExcel}
              className="bg-white text-[#963E56] hover:bg-white/90 border-none shadow-sm"
            >
              <Download className="mr-2 h-4 w-4" /> Exporteren
            </Button>
          </div>
        </div>
      </div>

      {/* Statistieken rij */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Totaal aantal leden kaart */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-gray-700">Totaal aantal leden</CardTitle>
            <div className="bg-blue-100 p-2 rounded-full">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-blue-600">{members.length}</div>
                <p className="text-sm text-gray-500 mt-1">
                  Actieve leden in het systeem
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Betaalde leden kaart */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 h-2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-gray-700">Leden die betaald hebben</CardTitle>
            <div className="bg-green-100 p-2 rounded-full">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-green-600">{paidMembers}</div>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="inline-flex items-center">
                    <Percent className="h-3 w-3 mr-1 text-green-600" />
                    <span className="font-medium text-green-600">{paymentPercentage}%</span> van alle leden
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Niet betaalde leden kaart */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 h-2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-gray-700">Leden die niet betaald hebben</CardTitle>
            <div className="bg-red-100 p-2 rounded-full">
              <X className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-red-600">{unpaidMembers}</div>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="inline-flex items-center">
                    <Percent className="h-3 w-3 mr-1 text-red-600" />
                    <span className="font-medium text-red-600">{100 - paymentPercentage}%</span> van alle leden
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Betaalstatus voortgangsbalk */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Betalingsoverzicht</CardTitle>
          <CardDescription>
            Percentage leden dat heeft betaald
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{paymentPercentage}% voltooid</span>
              <span className="text-sm text-muted-foreground">{paidMembers} van {members.length} leden</span>
            </div>
            <Progress value={paymentPercentage} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              <div className="bg-green-50 py-3 px-4 rounded-lg">
                <div className="text-green-600 font-semibold">{paidMembers}</div>
                <div className="text-xs text-muted-foreground">Betaald</div>
              </div>
              <div className="bg-red-50 py-3 px-4 rounded-lg">
                <div className="text-red-600 font-semibold">{unpaidMembers}</div>
                <div className="text-xs text-muted-foreground">Niet betaald</div>
              </div>
              <div className="bg-blue-50 py-3 px-4 rounded-lg">
                <div className="text-blue-600 font-semibold">{members.length}</div>
                <div className="text-xs text-muted-foreground">Totaal</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Snelle acties kaart */}
        <Card className="border-none shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#963E56]/20 to-[#963E56]/30 h-2" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-[#963E56]" /> 
              Snelle acties
            </CardTitle>
            <CardDescription>
              Beheer uw leden snel en efficiënt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/member/add" className="flex-1">
                <Button className="w-full bg-[#963E56] hover:bg-[#963E56]/90 text-white shadow-sm h-auto py-6">
                  <div className="flex flex-col items-center">
                    <UserPlus className="h-6 w-6 mb-2" />
                    <span>Lid toevoegen</span>
                  </div>
                </Button>
              </Link>
              <Link href="/members" className="flex-1">
                <Button variant="outline" className="w-full border-[#963E56] hover:bg-[#963E56]/5 text-[#963E56] h-auto py-6">
                  <div className="flex flex-col items-center">
                    <Users className="h-6 w-6 mb-2" />
                    <span>Ledenlijst bekijken</span>
                  </div>
                </Button>
              </Link>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={exportToExcel}
                className="w-full border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600 h-auto py-4"
              >
                <div className="flex flex-col items-center">
                  <Download className="h-5 w-5 mb-1" />
                  <span>Exporteren naar Excel</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Overzichtsstatistieken */}
        <Card className="border-none shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 h-2" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CalendarDays className="h-5 w-5 mr-2 text-purple-600" />
              Ledenoverzicht
            </CardTitle>
            <CardDescription>
              Details en statistieken van uw ledenbestand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <CalendarDays className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Meest recente registratie</div>
                      <div className="font-medium">
                        {mostRecentRegistration
                          ? mostRecentRegistration.toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : "-"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                    <div className="bg-[#963E56]/10 p-3 rounded-full">
                      <CreditCard className="h-5 w-5 text-[#963E56]" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Betaalstatus</div>
                      <div className="font-medium">
                        {paymentPercentage}% van de leden heeft betaald
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}