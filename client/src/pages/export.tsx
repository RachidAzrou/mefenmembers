import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, List, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Veldnamen en labels definitie
const FIELDS = [
  { id: "memberNumber", label: "Lidnummer", enabled: true },
  { id: "firstName", label: "Voornaam", enabled: true },
  { id: "lastName", label: "Achternaam", enabled: true },
  { id: "birthDate", label: "Geboortedatum", enabled: true },
  { id: "email", label: "E-mailadres", enabled: true },
  { id: "phoneNumber", label: "Telefoonnummer", enabled: true },
  { id: "accountNumber", label: "Rekeningnummer", enabled: true },
  { id: "paymentStatus", label: "Betaalstatus", enabled: true },
  { id: "registrationDate", label: "Registratiedatum", enabled: true },
  { id: "notes", label: "Notities", enabled: true },
];

export default function ExportPage() {
  const [exportFields, setExportFields] = useState(FIELDS);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const { toast } = useToast();
  
  // Haal alle leden op
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Filter leden op basis van betaalstatus
  const filteredMembers = members.filter(member => {
    if (paymentFilter === "all") return true;
    if (paymentFilter === "paid") return member.paymentStatus === true;
    if (paymentFilter === "unpaid") return member.paymentStatus === false;
    return true;
  });
  
  // Toggle een veld aan/uit
  const toggleField = (fieldId: string) => {
    setExportFields(fields => 
      fields.map(field => 
        field.id === fieldId 
          ? { ...field, enabled: !field.enabled } 
          : field
      )
    );
  };
  
  // Selecteer alle velden
  const selectAllFields = () => {
    setExportFields(fields => 
      fields.map(field => ({ ...field, enabled: true }))
    );
  };
  
  // Deselecteer alle velden
  const deselectAllFields = () => {
    setExportFields(fields => 
      fields.map(field => ({ ...field, enabled: false }))
    );
  };
  
  // Exporteer naar Excel
  const exportToExcel = () => {
    // Bouw de export data
    const exportData = filteredMembers.map(member => {
      const memberData: Record<string, any> = {};
      
      // Voeg alleen geselecteerde velden toe
      exportFields.forEach(field => {
        if (field.enabled) {
          switch (field.id) {
            case "birthDate":
              memberData[field.label] = member.birthDate 
                ? new Date(member.birthDate).toLocaleDateString() 
                : "";
              break;
            case "registrationDate":
              memberData[field.label] = new Date(member.registrationDate).toLocaleDateString();
              break;
            case "paymentStatus":
              memberData[field.label] = member.paymentStatus ? "Betaald" : "Niet betaald";
              break;
            default:
              memberData[field.label] = member[field.id as keyof Member] || "";
          }
        }
      });
      
      return memberData;
    });
    
    // Maak Excel werkblad en voeg data toe
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leden");
    
    // Genereer bestandsnaam met datum
    const date = new Date().toISOString().split('T')[0];
    const filename = `ledenlijst_${date}.xlsx`;
    
    // Download het bestand
    XLSX.writeFile(workbook, filename);
    
    toast({
      title: "Export voltooid",
      description: `De ledenlijst is geëxporteerd naar ${filename}`,
    });
  };
  
  // Exporteer naar CSV
  const exportToCsv = () => {
    // Bouw de export data
    const exportData = filteredMembers.map(member => {
      const memberData: Record<string, any> = {};
      
      // Voeg alleen geselecteerde velden toe
      exportFields.forEach(field => {
        if (field.enabled) {
          switch (field.id) {
            case "birthDate":
              memberData[field.label] = member.birthDate 
                ? new Date(member.birthDate).toLocaleDateString() 
                : "";
              break;
            case "registrationDate":
              memberData[field.label] = new Date(member.registrationDate).toLocaleDateString();
              break;
            case "paymentStatus":
              memberData[field.label] = member.paymentStatus ? "Betaald" : "Niet betaald";
              break;
            default:
              memberData[field.label] = member[field.id as keyof Member] || "";
          }
        }
      });
      
      return memberData;
    });
    
    // Maak CSV string
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Download als CSV bestand
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const date = new Date().toISOString().split('T')[0];
    const filename = `ledenlijst_${date}.csv`;
    
    // Download via link
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export voltooid",
      description: `De ledenlijst is geëxporteerd naar ${filename}`,
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header met gradient */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exporteren</h1>
            <p className="text-white/80">
              Exporteer de ledenlijst naar verschillende bestandsformaten.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/members">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                Terug naar Ledenlijst
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Statuskaart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-blue-100 p-3">
              <List className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Totaal leden</p>
              <p className="text-2xl font-bold text-blue-700">
                {isLoading ? <Skeleton className="h-8 w-16" /> : filteredMembers.length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Betaalde leden</p>
              <p className="text-2xl font-bold text-green-700">
                {isLoading ? 
                  <Skeleton className="h-8 w-16" /> : 
                  members.filter(m => m.paymentStatus).length
                }
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-purple-100 p-3">
              <FileSpreadsheet className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">Velden geselecteerd</p>
              <p className="text-2xl font-bold text-purple-700">
                {exportFields.filter(f => f.enabled).length} / {exportFields.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabbladen voor de verschillende exportformaten */}
      <Card className="overflow-hidden border-none shadow-md">
        <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
        <Tabs defaultValue="excel">
          <div className="px-6 pt-6 pb-2 border-b">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="excel" className="rounded-l-lg data-[state=active]:bg-[#963E56] data-[state=active]:text-white">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel (.xlsx)
              </TabsTrigger>
              <TabsTrigger value="csv" className="rounded-r-lg data-[state=active]:bg-[#963E56] data-[state=active]:text-white">
                <FileText className="mr-2 h-4 w-4" />
                CSV (.csv)
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="excel" className="m-0">
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Linker kolom: filter opties */}
                <div className="space-y-4">
                  <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                    <h3 className="text-base font-medium mb-3 text-blue-900 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-blue-700">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      Exporteer instellingen
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="payment-filter" className="text-blue-800">Filter op betaling</Label>
                        <Select 
                          value={paymentFilter} 
                          onValueChange={setPaymentFilter}
                        >
                          <SelectTrigger id="payment-filter" className="bg-white border-blue-100 mt-1">
                            <SelectValue placeholder="Filter op betaling" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle leden</SelectItem>
                            <SelectItem value="paid">Alleen betaald</SelectItem>
                            <SelectItem value="unpaid">Alleen niet betaald</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={selectAllFields} className="w-full border-blue-200 text-blue-800 hover:bg-blue-50">
                          <Check className="mr-2 h-4 w-4" />
                          Alles selecteren
                        </Button>
                        <Button variant="outline" size="sm" onClick={deselectAllFields} className="w-full border-blue-200 text-blue-800 hover:bg-blue-50">
                          Alles deselecteren
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Card className="shadow-sm border-gray-100">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base">Voorvertoning export</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="p-2">
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="flex items-center justify-between mb-1 pb-1 border-b">
                            <span className="text-muted-foreground">Totaal</span>
                            <span className="font-medium">{filteredMembers.length} leden</span>
                          </div>
                          <div className="flex items-center justify-between mb-1 pb-1 border-b">
                            <span className="text-muted-foreground">Velden</span>
                            <span className="font-medium">{exportFields.filter(f => f.enabled).length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Filter</span>
                            <span className="font-medium">
                              {paymentFilter === "all" 
                                ? "Alle leden" 
                                : paymentFilter === "paid" 
                                  ? "Alleen betaald" 
                                  : "Alleen niet betaald"
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Middelste en rechter kolom: velden selectie */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border p-4">
                    <h3 className="text-base font-medium mb-4 flex items-center text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-[#963E56]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Selecteer te exporteren velden
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {exportFields.map((field) => (
                        <div 
                          className={`flex items-center p-3 rounded-md border ${field.enabled ? 'bg-[#963E56]/5 border-[#963E56]/20' : 'bg-gray-50 border-gray-200'}`}
                          key={field.id}
                        >
                          <Checkbox
                            id={`field-${field.id}`}
                            checked={field.enabled}
                            onCheckedChange={() => toggleField(field.id)}
                            className={field.enabled ? 'data-[state=checked]:bg-[#963E56] data-[state=checked]:border-[#963E56]' : ''}
                          />
                          <Label 
                            htmlFor={`field-${field.id}`}
                            className={`ml-2 font-medium ${field.enabled ? 'text-[#963E56]' : 'text-gray-600'}`}
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end pt-6 mt-2 border-t">
                      <Button
                        onClick={exportToExcel}
                        disabled={isLoading || exportFields.filter(f => f.enabled).length === 0}
                        className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
                        size="lg"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Exporteren naar Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="csv" className="m-0">
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Linker kolom: filter opties */}
                <div className="space-y-4">
                  <div className="bg-green-50/50 rounded-lg p-4 border border-green-100">
                    <h3 className="text-base font-medium mb-3 text-green-900 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-green-700">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      Exporteer instellingen
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="payment-filter-csv" className="text-green-800">Filter op betaling</Label>
                        <Select 
                          value={paymentFilter} 
                          onValueChange={setPaymentFilter}
                        >
                          <SelectTrigger id="payment-filter-csv" className="bg-white border-green-100 mt-1">
                            <SelectValue placeholder="Filter op betaling" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle leden</SelectItem>
                            <SelectItem value="paid">Alleen betaald</SelectItem>
                            <SelectItem value="unpaid">Alleen niet betaald</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={selectAllFields} className="w-full border-green-200 text-green-800 hover:bg-green-50">
                          <Check className="mr-2 h-4 w-4" />
                          Alles selecteren
                        </Button>
                        <Button variant="outline" size="sm" onClick={deselectAllFields} className="w-full border-green-200 text-green-800 hover:bg-green-50">
                          Alles deselecteren
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Card className="shadow-sm border-gray-100">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base">Voorvertoning export</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="p-2">
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="flex items-center justify-between mb-1 pb-1 border-b">
                            <span className="text-muted-foreground">Totaal</span>
                            <span className="font-medium">{filteredMembers.length} leden</span>
                          </div>
                          <div className="flex items-center justify-between mb-1 pb-1 border-b">
                            <span className="text-muted-foreground">Velden</span>
                            <span className="font-medium">{exportFields.filter(f => f.enabled).length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Filter</span>
                            <span className="font-medium">
                              {paymentFilter === "all" 
                                ? "Alle leden" 
                                : paymentFilter === "paid" 
                                  ? "Alleen betaald" 
                                  : "Alleen niet betaald"
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Middelste en rechter kolom: velden selectie */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border p-4">
                    <h3 className="text-base font-medium mb-4 flex items-center text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-[#963E56]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Selecteer te exporteren velden
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {exportFields.map((field) => (
                        <div 
                          className={`flex items-center p-3 rounded-md border ${field.enabled ? 'bg-[#963E56]/5 border-[#963E56]/20' : 'bg-gray-50 border-gray-200'}`}
                          key={`csv-${field.id}`}
                        >
                          <Checkbox
                            id={`csv-field-${field.id}`}
                            checked={field.enabled}
                            onCheckedChange={() => toggleField(field.id)}
                            className={field.enabled ? 'data-[state=checked]:bg-[#963E56] data-[state=checked]:border-[#963E56]' : ''}
                          />
                          <Label 
                            htmlFor={`csv-field-${field.id}`}
                            className={`ml-2 font-medium ${field.enabled ? 'text-[#963E56]' : 'text-gray-600'}`}
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end pt-6 mt-2 border-t">
                      <Button
                        onClick={exportToCsv}
                        disabled={isLoading || exportFields.filter(f => f.enabled).length === 0}
                        className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
                        size="lg"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Exporteren naar CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}