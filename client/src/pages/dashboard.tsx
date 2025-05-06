import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, Check, X, Download, UserPlus, CalendarDays, 
  CreditCard, TrendingUp, Percent, UserCheck,
  Baby, GraduationCap, UserRound, Heart, BarChart3,
  PieChart, Briefcase, School, PersonStanding, Gamepad2,
  Accessibility, Leaf, MountainSnow, 
  Snowflake, UserCog, UserX, Smartphone,
  Backpack, BookOpen
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

      {/* Betaalstatus voortgangsbalk - vernieuwd */}
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
                  <Check className="h-4 w-4 mr-1.5" />
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
                  <X className="h-4 w-4 mr-1.5" />
                  {unpaidMembers}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Niet betaald</div>

              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overzichtsstatistieken - Nu met leeftijdscategorieën */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 h-2" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Statistieken
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
                {/* Meest recente registratie */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <CalendarDays className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Meest recente registratie</div>
                    <div className="font-medium">
                      {mostRecentRegistration
                        ? (() => {
                            const day = mostRecentRegistration.getDate();
                            const month = mostRecentRegistration.getMonth() + 1;
                            // Gebruik alleen de laatste twee cijfers van het jaar
                            const year = mostRecentRegistration.getFullYear().toString().slice(-2);
                            return `${day}/${month}/${year}`;
                          })()
                        : "-"}
                    </div>
                  </div>
                </div>
                
                {/* Leeftijdscategorieën */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tieners (13-17) */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Backpack className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Tieners (13-17 jaar)</div>
                      <div className="font-medium">
                        {teenagers} {teenagers === 1 ? "lid" : "leden"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Jongvolwassenen (<25) */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                    <div className="bg-green-100 p-3 rounded-full">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Jongvolwassenen (18-24 jaar)</div>
                      <div className="font-medium">
                        {youngAdults} {youngAdults === 1 ? "lid" : "leden"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Volwassenen (25-64) */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                    <div className="bg-orange-100 p-3 rounded-full">
                      <UserRound className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Volwassenen (25-64 jaar)</div>
                      <div className="font-medium">
                        {adults} {adults === 1 ? "lid" : "leden"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Ouderen (65+) */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 612 612" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-purple-600"
                      >
                        <path d="M317.838 105.827C317.838 151.25 281.329 187.759 235.906 187.759C190.483 187.759 153.974 151.25 153.974 105.827C153.974 60.404 190.483 23.895 235.906 23.895C281.329 23.895 317.838 60.404 317.838 105.827Z" fill="currentColor"/>
                        <path d="M451.316 453.101C451.316 453.101 414.24 429.864 413.364 352.358C413.215 337.143 410.958 322.004 406.631 307.445C394.874 315.361 381.273 320.142 366.939 321.359C360.483 323.352 353.739 324.391 346.939 324.391C317.236 324.391 291.566 308.694 278.774 285.069C273.598 290.551 267.635 295.324 260.913 299.173L245.797 526.7L207.746 525.094L222.431 302.723C215.992 301.186 209.848 298.664 204.196 295.152C176.662 346.551 176.662 452.226 176.662 452.226L135.78 452.083L135.673 423.714C135.673 346.394 163.946 264.677 219.387 207.348C229.766 196.594 240.909 186.662 252.692 177.637C252.692 177.637 252.75 177.595 252.856 177.563L252.894 177.534C263.661 169.381 275.356 162.574 287.722 157.317C299.31 152.367 311.522 148.838 324.026 146.825C338.139 144.66 352.517 144.875 366.581 147.463C370.324 134.349 378.621 122.855 390.115 115.376C401.609 107.897 415.659 105.267 429.366 107.983C443.073 110.698 455.265 118.561 463.423 129.803C471.582 141.044 475.15 155.031 473.453 168.87L488.484 224.115L502.35 269.052L507.441 287.031L503.204 288.573L498.976 290.096L454.747 305.088L450.519 306.602L446.291 308.124L442.063 309.638L433.367 312.913L453.694 390.501L511.627 401.298L504.628 442.295L451.316 453.101Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Ouderen (65+ jaar)</div>
                      <div className="font-medium">
                        {elderly} {elderly === 1 ? "lid" : "leden"}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}