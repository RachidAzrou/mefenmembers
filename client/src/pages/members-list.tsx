import React, { useState } from "react";
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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, Eye, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPhoneNumber } from "@/lib/utils";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
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
  const { toast } = useToast();
  
  // Haal alle leden op
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Filter leden op basis van zoekopdracht
  const filteredMembers = members.filter(member => {
    const matchesSearch = searchQuery === "" || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.memberNumber?.toString().includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.phoneNumber.includes(searchQuery);
    
    return matchesSearch;
  });
  
  // Exporteer ledenlijst naar Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredMembers.map(member => ({
      "Lidnummer": member.memberNumber,
      "Voornaam": member.firstName,
      "Achternaam": member.lastName,
      "Geboortedatum": member.birthDate ? new Date(member.birthDate).toLocaleDateString() : "",
      "E-mail": member.email || "",
      "Telefoonnummer": member.phoneNumber ? formatPhoneNumber(member.phoneNumber) : "",
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
    
    toast({
      title: "Lijst geëxporteerd",
      description: "De ledenlijst is succesvol geëxporteerd naar Excel.",
    });
  };
  
  // Formateer een datum voor weergave
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return format(date, "dd MMMM yyyy", { locale: nl });
    } catch (e) {
      return "-";
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ledenlijst</h1>
          <p className="text-muted-foreground">
            Beheer en bekijk alle leden van Moskee MEFEN.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/member/add">
            <Button
              className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" /> Nieuw lid
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="border-[#963E56] text-[#963E56] hover:bg-[#963E56]/10"
          >
            <Download className="mr-2 h-4 w-4" /> Exporteren
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Leden</CardTitle>
          <CardDescription>
            {filteredMembers.length} leden in totaal, {members.filter(m => m.paymentStatus).length} hebben betaald.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Zoeken op naam, lidnummer, e-mail of telefoon..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lidnummer</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead className="hidden md:table-cell">Geboortedatum</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="hidden md:table-cell">Telefoon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Geen leden gevonden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.memberNumber}
                      </TableCell>
                      <TableCell>
                        {member.firstName} {member.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(member.birthDate)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.email || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.phoneNumber ? formatPhoneNumber(member.phoneNumber) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={member.paymentStatus ? "default" : "outline"}
                          className={member.paymentStatus ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {member.paymentStatus ? "Betaald" : "Niet betaald"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menu openen</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acties</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewMember(member)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Details bekijken
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`/member/edit/${member.id}`}>
                                Bewerken
                              </Link>
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Lid details</DialogTitle>
              <DialogDescription>
                Gedetailleerde informatie over {viewMember.firstName} {viewMember.lastName}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Persoonlijke gegevens</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <span className="text-muted-foreground">Lidnummer:</span>{" "}
                    <span className="font-medium">{viewMember.memberNumber}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Naam:</span>{" "}
                    <span className="font-medium">{viewMember.firstName} {viewMember.lastName}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Geboortedatum:</span>{" "}
                    <span className="font-medium">{formatDate(viewMember.birthDate)}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Lid sinds:</span>{" "}
                    <span className="font-medium">{formatDate(viewMember.registrationDate)}</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Contact & betaling</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <span className="text-muted-foreground">E-mail:</span>{" "}
                    <span className="font-medium">{viewMember.email || "-"}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Telefoon:</span>{" "}
                    <span className="font-medium">{formatPhoneNumber(viewMember.phoneNumber)}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Rekeningnummer:</span>{" "}
                    <span className="font-medium">{viewMember.accountNumber || "-"}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Betaalstatus:</span>{" "}
                    <Badge 
                      variant={viewMember.paymentStatus ? "default" : "outline"}
                      className={viewMember.paymentStatus ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      {viewMember.paymentStatus ? "Betaald" : "Niet betaald"}
                    </Badge>
                  </li>
                </ul>
              </div>
            </div>
            
            {viewMember.notes && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Notities</h3>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {viewMember.notes}
                </p>
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <Link href={`/member/edit/${viewMember.id}`}>
                <Button variant="outline">Bewerken</Button>
              </Link>
              <Button onClick={() => setViewMember(null)}>Sluiten</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}