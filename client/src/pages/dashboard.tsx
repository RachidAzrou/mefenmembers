import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Check, X, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Member } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';

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
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overzicht van de ledenadministratie van Moskee MEFEN.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="border-[#963E56] text-[#963E56] hover:bg-[#963E56]/10"
          >
            <Download className="mr-2 h-4 w-4" /> Exporteren
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Totaal aantal leden kaart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totaal aantal leden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{members.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Totaal aantal geregistreerde leden
            </p>
          </CardContent>
        </Card>
        
        {/* Betaalde leden kaart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leden die betaald hebben</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-500">{paidMembers}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                `${Math.round((paidMembers / (members.length || 1)) * 100)}% van alle leden`
              )}
            </p>
          </CardContent>
        </Card>
        
        {/* Niet betaalde leden kaart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leden die niet betaald hebben</CardTitle>
            <X className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{unpaidMembers}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                `${Math.round((unpaidMembers / (members.length || 1)) * 100)}% van alle leden`
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Snelle links kaart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Snelle acties</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/member/add">
              <Button className="w-full md:w-auto bg-[#963E56] hover:bg-[#963E56]/90 text-white">
                Lid toevoegen
              </Button>
            </Link>
            <Link href="/members">
              <Button variant="outline" className="w-full md:w-auto">
                Ledenlijst bekijken
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="w-full md:w-auto"
            >
              Exporteren naar Excel
            </Button>
          </CardContent>
        </Card>
        
        {/* Recente activiteit/statistieken */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Ledenoverzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Meest recente registratie:</span>
                    <span>
                      {members.length > 0
                        ? new Date(
                            Math.max(
                              ...members.map(m => 
                                new Date(m.registrationDate).getTime()
                              )
                            )
                          ).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gemiddelde betaalstatus:</span>
                    <span>
                      {members.length > 0
                        ? `${Math.round(
                            (members.filter(m => m.paymentStatus).length /
                              members.length) *
                              100
                          )}%`
                        : "0%"}
                    </span>
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