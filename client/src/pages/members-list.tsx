import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Eye, MoreHorizontal, Plus, Search, SlidersHorizontal,
  CalendarDays, Check, X, Users, User, Phone, StickyNote, Edit,
  SortAsc, SortDesc, Trash2, ArrowUpDown, Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPhoneNumber } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function MembersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "paid" | "unpaid" | "recent">("all");
  const [sortField, setSortField] = useState<string>("memberNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Haal alle leden op
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Filter leden op basis van zoekopdracht en actieve filter
  const filteredMembers = members.filter(member => {
    // Eerst op zoekopdracht filteren
    const matchesSearch = searchQuery === "" || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.memberNumber?.toString().includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.phoneNumber.includes(searchQuery);
    
    // Vervolgens op actieve filter
    let matchesFilter = true;
    if (activeFilter === "paid") {
      matchesFilter = member.paymentStatus === true;
    } else if (activeFilter === "unpaid") {
      matchesFilter = member.paymentStatus === false;
    } else if (activeFilter === "recent") {
      // Beschouw "recent" als lid geworden in de afgelopen 30 dagen
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesFilter = new Date(member.registrationDate) >= thirtyDaysAgo;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Bereken leeftijd functie
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
  
  // Sorteer de gefilterde leden
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // Controleer de sorteerrichting
    const modifier = sortDirection === "asc" ? 1 : -1;
    
    // Sorteer op basis van het geselecteerde veld
    switch (sortField) {
      case "firstName":
        return a.firstName.localeCompare(b.firstName) * modifier;
      case "lastName":
        return a.lastName.localeCompare(b.lastName) * modifier;
      case "name":
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * modifier;
      case "memberNumber":
        return (a.memberNumber - b.memberNumber) * modifier;
      case "age":
        const ageA = calculateAge(a.birthDate) || 0;
        const ageB = calculateAge(b.birthDate) || 0;
        return (ageA - ageB) * modifier;
      case "registrationDate":
        return (new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()) * modifier;
      case "paymentStatus":
        // Voor paymentStatus, sorteren we paid eerst als asc, unpaid eerst als desc
        return ((a.paymentStatus === b.paymentStatus) ? 0 : a.paymentStatus ? -1 : 1) * modifier;
      default:
        return 0;
    }
  });
  
  // Toggle sorteerrichting of verander sorteerveld
  const toggleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Hier stond voorheen de exportToExcel functie die is verwijderd
  
  // Formateer een datum voor weergave in DD/MM/YYYY formaat
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "-";
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header section met gradient achtergrond - responsive */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-4 sm:p-6 shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Ledenlijst
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            Beheer en bekijk alle leden van Moskee MEFEN
          </p>
        </div>
      </div>
      
      {/* Ruimte voor header en statistieken */}
      <div className="my-4"></div>
      
      {/* Statistieken strook als actieve filters - klikbare kaarten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <button 
          onClick={() => setActiveFilter("all")}
          className={`text-left focus:outline-none rounded-lg ${
            activeFilter === "all" ? "focus:ring-2 focus:ring-blue-500" : ""
          }`}
        >
          <Card className={`overflow-hidden border-none shadow-md transition-all duration-200 ${
            activeFilter === "all" 
              ? "bg-blue-100 border-2 border-blue-500" 
              : "bg-blue-50 hover:bg-blue-100/70"
          }`}>
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-blue-100 mb-1 sm:mb-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600"/>
              </div>
              <div className="text-base sm:text-xl font-bold text-blue-600">
                {isLoading ? <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" /> : members.length}
              </div>
              <p className="text-[10px] sm:text-xs text-blue-800/70 text-center">Totaal leden</p>
              {activeFilter === "all" && (
                <div className="mt-1 bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-[8px] sm:text-[10px]">
                </div>
              )}
            </CardContent>
          </Card>
        </button>
        
        <button 
          onClick={() => activeFilter === "paid" ? setActiveFilter("all") : setActiveFilter("paid")}
          className={`text-left focus:outline-none rounded-lg ${
            activeFilter === "paid" ? "focus:ring-2 focus:ring-green-500" : ""
          }`}
        >
          <Card className={`overflow-hidden border-none shadow-md transition-all duration-200 ${
            activeFilter === "paid" 
              ? "bg-green-100 border-2 border-green-500" 
              : "bg-green-50 hover:bg-green-100/70"
          }`}>
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-green-100 mb-1 sm:mb-2">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600"/>
              </div>
              <div className="text-base sm:text-xl font-bold text-green-600">
                {isLoading ? <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" /> : members.filter(m => m.paymentStatus).length}
              </div>
              <p className="text-[10px] sm:text-xs text-green-800/70 text-center">Betaald</p>
              {activeFilter === "paid" && (
                <div className="mt-1 bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-[8px] sm:text-[10px]">
                </div>
              )}
            </CardContent>
          </Card>
        </button>
        
        <button 
          onClick={() => activeFilter === "unpaid" ? setActiveFilter("all") : setActiveFilter("unpaid")}
          className={`text-left focus:outline-none rounded-lg ${
            activeFilter === "unpaid" ? "focus:ring-2 focus:ring-red-500" : ""
          }`}
        >
          <Card className={`overflow-hidden border-none shadow-md transition-all duration-200 ${
            activeFilter === "unpaid" 
              ? "bg-red-100 border-2 border-red-500" 
              : "bg-red-50 hover:bg-red-100/70"
          }`}>
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-red-100 mb-1 sm:mb-2">
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600"/>
              </div>
              <div className="text-base sm:text-xl font-bold text-red-600">
                {isLoading ? <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" /> : members.length - members.filter(m => m.paymentStatus).length}
              </div>
              <p className="text-[10px] sm:text-xs text-red-800/70 text-center">Niet betaald</p>
              {activeFilter === "unpaid" && (
                <div className="mt-1 bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-[8px] sm:text-[10px]">
                </div>
              )}
            </CardContent>
          </Card>
        </button>
        
        <div className="rounded-lg">
          <Card className="overflow-hidden border-none shadow-md bg-purple-50">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center">
              <div className="rounded-full p-1.5 sm:p-2 bg-purple-100 mb-1 sm:mb-2">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600"/>
              </div>
              <div className="text-base sm:text-xl font-bold text-purple-600">
                {isLoading ? (
                  <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" />
                ) : (
                  members.length > 0
                    ? (() => {
                        const date = new Date(Math.max(...members.map(m => new Date(m.registrationDate).getTime())));
                        // Gebruik korte notatie DD/MM/JJ
                        const day = date.getDate();
                        const month = date.getMonth() + 1;
                        // Gebruik alleen de laatste twee cijfers van het jaar
                        const year = date.getFullYear().toString().slice(-2);
                        return `${day}/${month}/${year}`;
                      })()
                    : "-"
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-purple-800/70 text-center">Laatste registratie</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#963E56]" /> Ledenbestand
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {sortedMembers.length} leden gevonden
            {searchQuery ? ` voor zoekterm "${searchQuery}"` : ""}
            {activeFilter !== "all" && (
              <span className="block mt-1">
                <Badge variant="outline" className="bg-gray-50 text-[10px]">
                  {activeFilter === "paid" && "Filter: Alleen betaalde leden"}
                  {activeFilter === "unpaid" && "Filter: Alleen niet-betaalde leden"}
                  {/* Alle filters behouden in de filter badge */}
          {activeFilter === "recent" && "Filter: Alleen recent toegevoegde leden"} 
                  <button 
                    onClick={() => setActiveFilter("all")} 
                    className="ml-1 bg-gray-200 hover:bg-gray-300 rounded-full h-3 w-3 inline-flex items-center justify-center"
                  >
                    <X className="h-2 w-2 text-gray-500" />
                  </button>
                </Badge>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </div>
              <Input
                type="search"
                placeholder="Zoeken op naam, lidnummer..."
                className="pl-10 py-5 sm:py-6 text-sm sm:text-base border-gray-200 bg-gray-50 focus:bg-white transition-colors shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="md:w-auto w-full mt-2 md:mt-0 bg-white border-gray-200 text-xs sm:text-sm"
                >
                  {sortDirection === "asc" ? <SortAsc className="h-3.5 w-3.5 mr-2" /> : <SortDesc className="h-3.5 w-3.5 mr-2" />}
                  Sorteren op: {sortField === "firstName" ? "Voornaam" :
                    sortField === "lastName" ? "Naam" :
                    sortField === "name" ? "Volledige naam" : 
                    sortField === "memberNumber" ? "Lidnummer" : 
                    sortField === "age" ? "Leeftijd" : 
                    sortField === "registrationDate" ? "Registratiedatum" : 
                    sortField === "paymentStatus" ? "Betaalstatus" : "Naam"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup value={sortField} onValueChange={(value) => {
                  if (value === sortField) {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField(value);
                    setSortDirection("asc");
                  }
                }}>
                  <DropdownMenuRadioItem value="firstName" className="text-xs sm:text-sm cursor-pointer">
                    Op voornaam {sortField === "firstName" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="lastName" className="text-xs sm:text-sm cursor-pointer">
                    Op naam {sortField === "lastName" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name" className="text-xs sm:text-sm cursor-pointer">
                    Op volledige naam {sortField === "name" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="memberNumber" className="text-xs sm:text-sm cursor-pointer">
                    Op lidnummer {sortField === "memberNumber" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="age" className="text-xs sm:text-sm cursor-pointer">
                    Op leeftijd {sortField === "age" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="registrationDate" className="text-xs sm:text-sm cursor-pointer">
                    Op registratiedatum {sortField === "registrationDate" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="paymentStatus" className="text-xs sm:text-sm cursor-pointer">
                    Op betaalstatus {sortField === "paymentStatus" && (
                      <span className="ml-auto">
                        {sortDirection === "asc" ? 
                          <SortAsc className="h-3.5 w-3.5 text-gray-500" /> : 
                          <SortDesc className="h-3.5 w-3.5 text-gray-500" />
                        }
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("memberNumber")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Lidnr.
                      {sortField === "memberNumber" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("firstName")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Voornaam
                      {sortField === "firstName" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("lastName")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Naam
                      {sortField === "lastName" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("age")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Geboortedatum
                      {sortField === "age" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">E-mail</TableHead>
                  <TableHead className="hidden md:table-cell font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">Telefoon</TableHead>
                  <TableHead className="font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">
                    <button 
                      onClick={() => toggleSort("paymentStatus")} 
                      className="flex items-center hover:text-[#963E56] transition-colors"
                    >
                      Status
                      {sortField === "paymentStatus" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? 
                            <SortAsc className="h-3 w-3" /> : 
                            <SortDesc className="h-3 w-3" />
                          }
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right font-medium sm:font-semibold text-xs sm:text-sm text-gray-700">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Users className="h-10 w-10 mb-2 text-gray-300" />
                        <p className="mb-1">Geen leden gevonden</p>
                        <p className="text-sm text-gray-400">
                          {searchQuery ? 
                            "Probeer een andere zoekterm of voeg een nieuw lid toe" : 
                            "Voeg een nieuw lid toe om te beginnen"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-[#963E56] text-xs sm:text-sm py-2 sm:py-4">
                        {member.memberNumber.toString().padStart(4, '0')}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                        {member.firstName}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                        {member.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600 text-xs sm:text-sm py-2 sm:py-4">
                        {formatDate(member.birthDate)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600 text-xs sm:text-sm py-2 sm:py-4">
                        {member.email || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600 text-xs sm:text-sm py-2 sm:py-4">
                        {member.phoneNumber ? formatPhoneNumber(member.phoneNumber) : "-"}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <Badge 
                          variant={member.paymentStatus ? "default" : "outline"}
                          className={`text-[10px] sm:text-xs ${member.paymentStatus 
                            ? "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
                            : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"}`}
                        >
                          {member.paymentStatus 
                            ? "✓ Betaald" 
                            : "Niet betaald"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menu openen</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel>Acties</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewMember(member)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              Details bekijken
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/member/edit/${member.id}`)} className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" />
                              Bewerken
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Lid details dialoog */}
      {viewMember && (
        <Dialog open={!!viewMember} onOpenChange={() => setViewMember(null)}>
          <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-[#963E56]/90 to-[#963E56] p-4 sm:p-6 text-white">
              <DialogHeader className="text-white">
                <DialogTitle className="text-lg sm:text-xl text-white">
                  {viewMember.firstName} {viewMember.lastName}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-xs sm:text-sm">
                  Lidnummer: {viewMember.memberNumber.toString().padStart(4, '0')} • Lid sinds {formatDate(viewMember.registrationDate)}
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                    Persoonlijke gegevens
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm text-gray-500">Volledige naam</div>
                      <div className="font-medium text-sm sm:text-base">{viewMember.firstName} {viewMember.lastName}</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm text-gray-500">Geboortedatum</div>
                      <div className="font-medium text-sm sm:text-base">{formatDate(viewMember.birthDate)}</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm text-gray-500">Lid sinds</div>
                      <div className="font-medium text-sm sm:text-base">{formatDate(viewMember.registrationDate)}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center mt-4 md:mt-0">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                    Contact & betaling
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm text-gray-500">E-mail</div>
                      <div className="font-medium text-sm sm:text-base">{viewMember.email || "Niet opgegeven"}</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm text-gray-500">Telefoon</div>
                      <div className="font-medium text-sm sm:text-base">{formatPhoneNumber(viewMember.phoneNumber)}</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm text-gray-500">Rekeningnummer</div>
                      <div className="font-medium text-sm sm:text-base">{viewMember.accountNumber || "Niet opgegeven"}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6 flex items-center p-3 sm:p-4 rounded-lg bg-gray-50 gap-3 sm:gap-4">
                <div className={`p-2 sm:p-3 rounded-full ${viewMember.paymentStatus ? 'bg-green-100' : 'bg-red-100'}`}>
                  {viewMember.paymentStatus ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-500">Betaalstatus</div>
                  <div className="text-sm sm:text-base font-medium">
                    {viewMember.paymentStatus ? "Betaald" : "Niet betaald"}
                  </div>
                </div>
              </div>
              
              {viewMember.notes && (
                <div className="mt-4 sm:mt-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                    <StickyNote className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#963E56]" /> 
                    Notities
                  </h3>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg whitespace-pre-wrap text-gray-600 text-xs sm:text-sm">
                    {viewMember.notes}
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-end gap-2 bg-gray-50">
              <Button 
                variant="outline" 
                onClick={() => setViewMember(null)}
                className="border-gray-300 text-gray-700 text-xs sm:text-sm w-full sm:w-auto order-2 sm:order-1"
              >
                Sluiten
              </Button>
              {/* Bewerken knop verwijderd op verzoek */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}