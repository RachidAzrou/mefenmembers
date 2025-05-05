import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Check, FileDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// PDF Stylesheet voor het genereren van een mooi en professioneel PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  headerContainer: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#963E56',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#963E56',
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
  },
  date: {
    fontSize: 9,
    color: '#666666',
    marginTop: 2,
  },
  filterInfo: {
    fontSize: 9,
    color: '#963E56',
    fontWeight: 'bold',
    marginTop: 2,
  },
  tableWrapper: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  table: {
    display: 'flex',
    width: 'auto',
  },
  tableHeader: {
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tableCell: {
    padding: 5,
    fontSize: 8,
    color: '#444444',
  },
  paidCell: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  unpaidCell: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#963E56',
    fontWeight: 'bold',
  },
  pageNumber: {
    fontSize: 8,
    color: '#888888',
  },
  summary: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 15,
  },
  summaryBox: {
    flexDirection: 'column',
    padding: 5,
    width: '22%',
  },
  summaryTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#963E56',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
});
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Veldnamen en labels definitie
const FIELDS = [
  { id: "memberNumber", label: "Lidnr.", enabled: true },
  { id: "firstName", label: "Voornaam", enabled: true },
  { id: "lastName", label: "Achternaam", enabled: true },
  { id: "birthDate", label: "Geb.datum", enabled: true },
  { id: "email", label: "E-mail", enabled: true },
  { id: "phoneNumber", label: "Telefoon", enabled: true },
  { id: "accountNumber", label: "Rekening", enabled: true },
  { id: "paymentStatus", label: "Betaald", enabled: true },
  { id: "registrationDate", label: "Reg.datum", enabled: true },
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
  
  // Toggle tussen alle velden selecteren/deselecteren
  const toggleAllFields = () => {
    // Controleer of alle velden momenteel geselecteerd zijn
    const allSelected = exportFields.every(field => field.enabled);
    
    // Als alle velden geselecteerd zijn, deselecteer alles, anders selecteer alles
    setExportFields(fields => 
      fields.map(field => ({ ...field, enabled: !allSelected }))
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
  
  // PDF Document component voor PDF export
  const MembersPDF = useMemo(() => {
    // Selecteer de enabled velden
    const enabledFields = exportFields.filter(field => field.enabled);
    
    // Optimaliseren van kolombreedte op basis van het aantal en type geselecteerde velden
    const columnWidths: Record<string, string> = {};
    
    // Pas de breedtes aan op basis van het aantal geselecteerde velden
    const numSelectedFields = enabledFields.length;
    const isCompact = numSelectedFields > 7; // Als er veel velden zijn, maak dan alles compacter
    
    enabledFields.forEach(field => {
      switch (field.id) {
        case "memberNumber":
          // Lidnummer is kort
          columnWidths[field.id] = isCompact ? "6%" : "7%";
          break;
        case "firstName":
          columnWidths[field.id] = isCompact ? "10%" : "12%";
          break;
        case "lastName":
          // Achternamen zijn vaak langer dan voornamen
          columnWidths[field.id] = isCompact ? "12%" : "14%";
          break;
        case "birthDate":
          // Datums hebben een vaste lengte
          columnWidths[field.id] = isCompact ? "9%" : "10%";
          break;
        case "registrationDate":
          // Registratiedatum maken we korter
          columnWidths[field.id] = isCompact ? "8%" : "9%";
          break;
        case "paymentStatus":
          // Status heeft alleen ✓ of ✗, dus zeer compact
          columnWidths[field.id] = isCompact ? "5%" : "6%";
          break;
        case "email":
          // Email is vaak lang, dus meer ruimte
          columnWidths[field.id] = isCompact ? "16%" : "18%";
          break;
        case "phoneNumber":
          columnWidths[field.id] = isCompact ? "10%" : "12%";
          break;
        case "accountNumber":
          columnWidths[field.id] = isCompact ? "12%" : "14%";
          break;
        case "notes":
          // Notities compacter maken als er veel velden zijn
          columnWidths[field.id] = isCompact ? "12%" : "16%";
          break;
        default:
          columnWidths[field.id] = isCompact ? "8%" : "10%";
      }
    });
    
    // Datum weergave
    const today = new Date().toLocaleDateString('nl-NL');

    // Bereken statistieken voor de samenvatting
    const totalMembers = filteredMembers.length;
    const paidMembers = filteredMembers.filter(m => m.paymentStatus).length;
    const unpaidMembers = totalMembers - paidMembers;
    const paidPercentage = totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;
    
    // Formatteer datums
    const formattedDate = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const time = new Date().toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header met logo en titel */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.header}>MEFEN Ledenlijst</Text>
              <Text style={styles.subtitle}>Exported: {formattedDate} om {time}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.filterInfo}>
                {paymentFilter === "all" 
                  ? "Alle leden" 
                  : paymentFilter === "paid" 
                    ? "Alleen betaalde leden" 
                    : "Alleen onbetaalde leden"
                }
              </Text>
              <Text style={styles.date}>Totaal: {filteredMembers.length} leden</Text>
            </View>
          </View>

          {/* Verwijder samenvatting sectie voor cleanere PDF export */}
          
          {/* Tabel met leden */}
          <View style={styles.tableWrapper}>
            {/* Tabelheader */}
            <View style={styles.tableHeader}>
              {enabledFields.map(field => (
                <Text 
                  key={field.id} 
                  style={{
                    ...styles.tableHeaderCell,
                    width: columnWidths[field.id]
                  }}
                >
                  {field.label}
                </Text>
              ))}
            </View>
            
            {/* Tabelrijen */}
            {filteredMembers.map((member, index) => (
              <View 
                key={member.id} 
                style={{
                  ...styles.tableRow,
                  backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                }}
              >
                {enabledFields.map(field => {
                  let value;
                  
                  switch (field.id) {
                    case "birthDate":
                      // Compacte datumnotatie: DD-MM-YYYY
                      const bdate = new Date(member.birthDate);
                      value = member.birthDate ? `${bdate.getDate().toString().padStart(2, '0')}-${(bdate.getMonth() + 1).toString().padStart(2, '0')}-${bdate.getFullYear()}` : "";
                      break;
                    case "registrationDate":
                      // Compacte datumnotatie: DD-MM-YYYY
                      const rdate = new Date(member.registrationDate);
                      value = `${rdate.getDate().toString().padStart(2, '0')}-${(rdate.getMonth() + 1).toString().padStart(2, '0')}-${rdate.getFullYear()}`;
                      break;
                    case "paymentStatus":
                      value = member.paymentStatus ? "✓" : "✗";
                      return (
                        <Text 
                          key={field.id} 
                          style={{
                            ...styles.tableCell,
                            width: columnWidths[field.id],
                            textAlign: 'center',
                            ...(member.paymentStatus ? styles.paidCell : styles.unpaidCell)
                          }}
                        >
                          {value}
                        </Text>
                      );
                    case "memberNumber":
                      // Lidnummers altijd met voorloopnullen voor consistentie
                      value = member.memberNumber.toString().padStart(4, '0');
                      break;
                    default:
                      value = member[field.id as keyof Member] || "";
                  }
                  
                  return (
                    <Text 
                      key={field.id} 
                      style={{
                        ...styles.tableCell,
                        width: columnWidths[field.id]
                      }}
                    >
                      {value}
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>MEFEN Ledenbeheer • Automatisch gegenereerd</Text>
            <Text style={styles.pageNumber}>Pagina 1 van 1</Text>
          </View>
        </Page>
      </Document>
    );
  }, [exportFields, filteredMembers, paymentFilter]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-4 sm:p-6 shadow-md text-white">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Exporteer ledenlijst</h1>
        <p className="text-white/80 text-sm sm:text-base mt-1">
          Exporteer de ledenlijst in verschillende formaten voor gebruik buiten het systeem.
        </p>
      </div>
      
      {/* Statistieken */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4">
            <div className="rounded-full bg-blue-100 p-2 sm:p-3">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-blue-900">Totaal leden</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">
                {isLoading ? 
                  <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : 
                  members.length
                }
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-100 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4">
            <div className="rounded-full bg-green-100 p-2 sm:p-3">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-green-900">Betaald</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">
                {isLoading ? 
                  <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : 
                  members.filter(m => m.paymentStatus).length
                }
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-100 shadow-sm sm:col-span-2 md:col-span-1">
          <CardContent className="p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4">
            <div className="rounded-full bg-purple-100 p-2 sm:p-3">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-purple-900">Velden geselecteerd</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700">
                {exportFields.filter(f => f.enabled).length} / {exportFields.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabbladen voor de verschillende exportformaten - verbeterd voor mobiel */}
      <Card className="overflow-hidden border-none shadow-md">
        <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
        <Tabs defaultValue="excel">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
            <TabsList className="grid w-full grid-cols-3 max-w-sm sm:max-w-lg mx-auto">
              <TabsTrigger value="excel" className="text-xs sm:text-sm rounded-l-lg data-[state=active]:bg-[#963E56] data-[state=active]:text-white">
                <FileSpreadsheet className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Excel (.xlsx)
              </TabsTrigger>
              <TabsTrigger value="csv" className="text-xs sm:text-sm data-[state=active]:bg-[#963E56] data-[state=active]:text-white">
                <FileText className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                CSV (.csv)
              </TabsTrigger>
              <TabsTrigger value="pdf" className="text-xs sm:text-sm rounded-r-lg data-[state=active]:bg-[#963E56] data-[state=active]:text-white">
                <FileDown className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                PDF (.pdf)
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="excel" className="m-0">
            <div className="p-4 sm:p-6">
              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                {/* Linker kolom: filter opties */}
                <div className="space-y-4">
                  <div className="bg-blue-50/50 rounded-lg p-3 sm:p-4 border border-blue-100">
                    <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3 text-blue-900 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-blue-700">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      Filters
                    </h3>
                    <div className="space-y-3">
                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={toggleAllFields} 
                          className="w-full text-xs sm:text-sm border-blue-200 text-blue-800 hover:bg-blue-50"
                        >
                          {exportFields.every(field => field.enabled) ? (
                            <>
                              <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Alles deselecteren
                            </>
                          ) : (
                            <>
                              <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Alles selecteren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Middelste en rechter kolom: velden selectie */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base font-medium mb-3 sm:mb-4 flex items-center text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-[#963E56]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Selecteer te exporteren velden
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      {exportFields.map((field) => (
                        <div 
                          className={`flex items-center p-2 sm:p-3 rounded-md border ${field.enabled ? 'bg-[#963E56]/5 border-[#963E56]/20' : 'bg-gray-50 border-gray-200'}`}
                          key={field.id}
                        >
                          <Checkbox
                            id={`field-${field.id}`}
                            checked={field.enabled}
                            onCheckedChange={() => toggleField(field.id)}
                            className={field.enabled ? 'data-[state=checked]:bg-[#963E56] data-[state=checked]:border-[#963E56] h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'}
                          />
                          <Label 
                            htmlFor={`field-${field.id}`}
                            className={`ml-2 text-xs sm:text-sm font-medium ${field.enabled ? 'text-[#963E56]' : 'text-gray-600'}`}
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-center sm:justify-end pt-4 sm:pt-6 mt-2 border-t">
                      <Button
                        onClick={exportToExcel}
                        disabled={isLoading || exportFields.filter(f => f.enabled).length === 0}
                        className="bg-[#963E56] hover:bg-[#963E56]/90 text-white w-full sm:w-auto"
                        size="default"
                      >
                        <Download className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">Exporteren naar Excel</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="csv" className="m-0">
            <div className="p-4 sm:p-6">
              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                {/* Linker kolom: filter opties */}
                <div className="space-y-4">
                  <div className="bg-green-50/50 rounded-lg p-3 sm:p-4 border border-green-100">
                    <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3 text-green-900 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-green-700">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      Filters
                    </h3>
                    <div className="space-y-3">
                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={toggleAllFields} 
                          className="w-full text-xs sm:text-sm border-green-200 text-green-800 hover:bg-green-50"
                        >
                          {exportFields.every(field => field.enabled) ? (
                            <>
                              <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Alles deselecteren
                            </>
                          ) : (
                            <>
                              <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Alles selecteren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Middelste en rechter kolom: velden selectie */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base font-medium mb-3 sm:mb-4 flex items-center text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-[#963E56]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Selecteer te exporteren velden
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      {exportFields.map((field) => (
                        <div 
                          className={`flex items-center p-2 sm:p-3 rounded-md border ${field.enabled ? 'bg-[#963E56]/5 border-[#963E56]/20' : 'bg-gray-50 border-gray-200'}`}
                          key={`csv-${field.id}`}
                        >
                          <Checkbox
                            id={`csv-field-${field.id}`}
                            checked={field.enabled}
                            onCheckedChange={() => toggleField(field.id)}
                            className={field.enabled ? 'data-[state=checked]:bg-[#963E56] data-[state=checked]:border-[#963E56] h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'}
                          />
                          <Label 
                            htmlFor={`csv-field-${field.id}`}
                            className={`ml-2 text-xs sm:text-sm font-medium ${field.enabled ? 'text-[#963E56]' : 'text-gray-600'}`}
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-center sm:justify-end pt-4 sm:pt-6 mt-2 border-t">
                      <Button
                        onClick={exportToCsv}
                        disabled={isLoading || exportFields.filter(f => f.enabled).length === 0}
                        className="bg-[#963E56] hover:bg-[#963E56]/90 text-white w-full sm:w-auto"
                        size="default"
                      >
                        <Download className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">Exporteren naar CSV</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* PDF Tab Content */}
          <TabsContent value="pdf" className="m-0">
            <div className="p-4 sm:p-6">
              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                {/* Linker kolom: filter opties */}
                <div className="space-y-4">
                  <div className="bg-purple-50/50 rounded-lg p-3 sm:p-4 border border-purple-100">
                    <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3 text-purple-900 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-purple-700">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      Filters
                    </h3>
                    <div className="space-y-3">
                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={toggleAllFields} 
                          className="w-full text-xs sm:text-sm border-purple-200 text-purple-800 hover:bg-purple-50"
                        >
                          {exportFields.every(field => field.enabled) ? (
                            <>
                              <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Alles deselecteren
                            </>
                          ) : (
                            <>
                              <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Alles selecteren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Middelste en rechter kolom: velden selectie */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base font-medium mb-3 sm:mb-4 flex items-center text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-purple-600">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Selecteer te exporteren velden
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      {exportFields.map((field) => (
                        <div 
                          className={`flex items-center p-2 sm:p-3 rounded-md border ${field.enabled ? 'bg-[#963E56]/5 border-[#963E56]/20' : 'bg-gray-50 border-gray-200'}`}
                          key={`pdf-${field.id}`}
                        >
                          <Checkbox
                            id={`pdf-field-${field.id}`}
                            checked={field.enabled}
                            onCheckedChange={() => toggleField(field.id)}
                            className={field.enabled ? 'data-[state=checked]:bg-[#963E56] data-[state=checked]:border-[#963E56] h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'}
                          />
                          <Label 
                            htmlFor={`pdf-field-${field.id}`}
                            className={`ml-2 text-xs sm:text-sm font-medium ${field.enabled ? 'text-[#963E56]' : 'text-gray-600'}`}
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-center sm:justify-end pt-4 sm:pt-6 mt-2 border-t">
                      <PDFDownloadLink
                        document={MembersPDF}
                        fileName={`ledenlijst_${new Date().toISOString().split('T')[0]}.pdf`}
                        className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#963E56] hover:bg-[#963E56]/90 text-white h-10 px-4 py-2 w-full sm:w-auto ${
                          isLoading || exportFields.filter(f => f.enabled).length === 0 ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {({ loading }) => 
                          loading ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              PDF Voorbereiden...
                            </span>
                          ) : (
                            <>
                              <FileDown className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="text-xs sm:text-sm">Exporteren naar PDF</span>
                            </>
                          )
                        }
                      </PDFDownloadLink>
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