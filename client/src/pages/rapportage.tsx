import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
  ScatterChart, Scatter, ZAxis, AreaChart, Area, ComposedChart,

} from 'recharts';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from '@/components/ui/label';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Loader2, Download, Calendar, ChevronDown, ChevronUp, Users, Wallet, CreditCard, Clock, UserCheck, BarChart3, 
  MapPin, Map as MapIcon, Globe, LineChart as LineChartIcon, PieChart as PieChartIcon, Target, Zap, Activity, FileIcon, ImageIcon } from "lucide-react";
import MyPdfDocument from '@/components/pdf/report-pdf';
import { cn } from '@/lib/utils';
import { format, subMonths, differenceInYears, differenceInMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Member } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportChartAsJPG, exportAllChartsToPDF } from '@/lib/chart-export';

// Helper functie om leeftijd te berekenen op basis van geboortedatum
function calculateAge(birthDate: Date | string | null | undefined): number {
  if (!birthDate) return 0;
  const birthDateObj = new Date(birthDate);
  return differenceInYears(new Date(), birthDateObj);
}

// Groepeer leden per leeftijdscategorie
function groupMembersByAgeRange(members: Member[]): { name: string; count: number; color: string }[] {
  const ageGroups = [
    { name: "0-12", min: 0, max: 12, color: "#963E56" },
    { name: "13-17", min: 13, max: 17, color: "#B85370" },
    { name: "18-24", min: 18, max: 24, color: "#D86985" },
    { name: "25-34", min: 25, max: 34, color: "#E47F95" },
    { name: "35-49", min: 35, max: 49, color: "#EB96A7" },
    { name: "50-64", min: 50, max: 64, color: "#F1ACBA" },
    { name: "65+", min: 65, max: 120, color: "#F7C3CC" }
  ];

  // Initialiseer resultaten met 0 voor alle categorieën
  const results = ageGroups.map(group => ({ 
    name: group.name, 
    count: 0, 
    color: group.color 
  }));

  // Tel leden per leeftijdscategorie
  members.forEach(member => {
    const age = calculateAge(member.birthDate);
    const group = ageGroups.find(g => age >= g.min && age <= g.max);
    if (group) {
      const index = results.findIndex(r => r.name === group.name);
      if (index >= 0) {
        results[index].count++;
      }
    }
  });

  return results;
}

// Bereken de geschatte inkomsten per lid per maand op basis van betalingstermijn
// Functie bijgewerkt om contributieAmounts uit state te gebruiken
function calculateMemberRevenue(member: Member, contributionAmounts: Record<string, number>): number {
  const paymentTermMultiplier: Record<string, number> = {
    "jaarlijks": 1/12,
    "halfjaarlijks": 1/6,
    "per kwartaal": 1/3,
    "maandelijks": 1
  };

  const memberType = member.membershipType?.toLowerCase() || "regulier";
  const baseAmount = contributionAmounts[memberType] || 10;
  const multiplier = paymentTermMultiplier[member.paymentTerm?.toLowerCase() || "maandelijks"] || 1;
  
  return baseAmount * multiplier;
}

// Groepeer leden per lidmaatschapstype
function groupMembersByMembershipType(members: Member[]): { name: string; count: number; color: string }[] {
  const membershipTypes = [
    { name: "Regulier", color: "#963E56" },
    { name: "Student", color: "#B85370" },
    { name: "Gezin", color: "#D86985" },
    { name: "Verminderd tarief", color: "#E47F95" },
    { name: "Erelid", color: "#F1ACBA" }
  ];

  // Initialiseer resultaten
  const results = membershipTypes.map(type => ({ 
    name: type.name, 
    count: 0, 
    color: type.color 
  }));

  // Tel leden per type
  members.forEach(member => {
    const typeName = member.membershipType || "Regulier";
    const index = results.findIndex(r => 
      r.name.toLowerCase() === typeName.toLowerCase()
    );
    if (index >= 0) {
      results[index].count++;
    }
  });

  return results;
}

// Groepeer leden per betaalmethode
function groupMembersByPaymentMethod(members: Member[]): { name: string; count: number; color: string }[] {
  // We gebruiken alleen de 3 correcte betalingsmethodes volgens de gebruiker
  const paymentMethods = [
    { name: "Cash", color: "#963E56" },
    { name: "Overschrijving", color: "#B85370" },
    { name: "Domiciliering", color: "#D86985" }
  ];

  // Initialiseer resultaten
  const results = paymentMethods.map(method => ({ 
    name: method.name, 
    count: 0, 
    color: method.color 
  }));

  // Tel leden per betaalmethode en map de bestaande waarden naar de nieuwe
  members.forEach(member => {
    let methodName = member.paymentMethod || "";
    
    // Mapping van bestaande waardes naar de nieuwe categorieën
    if (methodName.toLowerCase().includes("contant") || 
        methodName.toLowerCase().includes("cash")) {
      methodName = "Cash";
    } else if (methodName.toLowerCase().includes("overschrijving") ||
              methodName.toLowerCase().includes("bank")) {
      methodName = "Overschrijving";
    } else if (methodName.toLowerCase().includes("incasso") ||
              methodName.toLowerCase().includes("domiciliering") ||
              methodName.toLowerCase().includes("automatisch")) {
      methodName = "Domiciliering";
    } else {
      // Als het geen van de bekende methodes is, kiezen we Overschrijving als default
      methodName = "Overschrijving";
    }
    
    const index = results.findIndex(r => r.name === methodName);
    if (index >= 0) {
      results[index].count++;
    }
  });

  return results;
}

// Groepeer leden per betalingstermijn
function groupMembersByPaymentTerm(members: Member[]): { name: string; count: number; color: string }[] {
  const paymentTerms = [
    { name: "Maandelijks", color: "#963E56" },
    { name: "Per kwartaal", color: "#B85370" },
    { name: "Halfjaarlijks", color: "#D86985" },
    { name: "Jaarlijks", color: "#F1ACBA" }
  ];

  // Initialiseer resultaten
  const results = paymentTerms.map(term => ({ 
    name: term.name, 
    count: 0, 
    color: term.color 
  }));

  // Tel leden per betalingstermijn
  members.forEach(member => {
    const termName = member.paymentTerm || "Maandelijks";
    const index = results.findIndex(r => 
      r.name.toLowerCase() === termName.toLowerCase()
    );
    if (index >= 0) {
      results[index].count++;
    }
  });

  return results;
}

// Groepeer leden per geslacht
function groupMembersByGender(members: Member[]): { name: string; count: number; color: string }[] {
  return [
    { 
      name: "Man", 
      count: members.filter(m => m.gender?.toLowerCase() === "man").length,
      color: "#963E56"
    },
    { 
      name: "Vrouw", 
      count: members.filter(m => m.gender?.toLowerCase() === "vrouw").length,
      color: "#D86985"
    }
  ];
}

// Groepeer leden per woonplaats/stad
function groupMembersByCity(members: Member[]): { name: string; count: number; color: string }[] {
  // Verzamel alle unieke steden
  const cities = [...new Set(members.map(m => m.city?.toLowerCase()).filter(Boolean))];
  
  // Genereer een array van kleuren voor de verschillende steden
  const colors = [
    "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22", "#E74C3C", 
    "#1ABC9C", "#34495E", "#7F8C8D", "#8E44AD", "#27AE60", "#D35400",
    "#16A085", "#2980B9", "#8E44AD", "#2C3E50", "#F39C12", "#D35400",
    "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22", "#E74C3C"
  ];

  // Sorteer de resultaten en toon alle steden (niet beperkt tot top 10)
  return cities
    .map(city => {
      const count = members.filter(m => m.city?.toLowerCase() === city).length;
      return {
        name: city ? city.charAt(0).toUpperCase() + city.slice(1) : "Onbekend",
        count,
        color: "#3498DB" // Standaard kleur, wordt later bijgewerkt
      };
    })
    .sort((a, b) => b.count - a.count)
    .map((city, index) => ({
      ...city,
      color: colors[index % colors.length]
    }));
}

// Groepeer leden per postcode gebied
function groupMembersByPostalArea(members: Member[]): { name: string; count: number; color: string }[] {
  // Extracteer het eerste gedeelte van de postcode (bijv. "1000" van "1000AB")
  const postalAreas = members
    .map(m => m.postalCode?.substring(0, 2))
    .filter(Boolean) as string[];
  
  // Tel leden per postcodegebied
  const areaCounts: Record<string, number> = {};
  postalAreas.forEach(area => {
    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  // Genereer een array van kleuren voor de verschillende postcodegebieden
  const colors = [
    "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22", "#E74C3C", 
    "#1ABC9C", "#34495E", "#7F8C8D", "#8E44AD", "#27AE60", "#D35400",
    "#16A085", "#2980B9", "#8E44AD", "#2C3E50", "#F39C12", "#D35400",
    "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22", "#E74C3C"
  ];

  // Converteer naar de juiste format en sorteer (toon alle postcodegebieden)
  return Object.entries(areaCounts)
    .map(([area, count]) => ({
      name: `${area}xx gebied`,
      count,
      color: "#3498DB" // Standaard kleur, wordt later bijgewerkt
    }))
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }));
}

// Groepeer leden per nationaliteit
function groupMembersByNationality(members: Member[]): { name: string; count: number; color: string }[] {
  // Verzamel alle unieke nationaliteiten
  const nationalities = [...new Set(members.map(m => m.nationality?.toLowerCase()).filter(Boolean))];
  
  // Genereer een array van kleuren voor de verschillende nationaliteiten
  const colors = [
    "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22", "#E74C3C", 
    "#1ABC9C", "#34495E", "#7F8C8D", "#8E44AD", "#27AE60", "#D35400",
    "#16A085", "#2980B9", "#8E44AD", "#2C3E50", "#F39C12", "#D35400",
    "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22", "#E74C3C"
  ];

  // Sorteer de resultaten en toon alle nationaliteiten (niet beperkt tot top 10)
  return nationalities
    .map(nationality => {
      const count = members.filter(m => m.nationality?.toLowerCase() === nationality).length;
      return {
        name: nationality ? nationality.charAt(0).toUpperCase() + nationality.slice(1) : "Onbekend",
        count,
        color: "#3498DB" // Standaard kleur, wordt later bijgewerkt
      };
    })
    .sort((a, b) => b.count - a.count)
    .map((nationality, index) => ({
      ...nationality,
      color: colors[index % colors.length]
    }));
}

// Groepeer leden per betaalstatus
function groupMembersByPaymentStatus(members: Member[]): { name: string; value: number; color: string }[] {
  console.log("Payment status values:", members.map(m => m.paymentStatus));
  
  // Tel hoeveel leden betaald hebben
  const betaald = members.filter(m => {
    // Check voor alle mogelijke variaties van "betaald" in de status
    if (typeof m.paymentStatus === 'string') {
      const status = m.paymentStatus.toLowerCase();
      return status.includes('betaald') || 
             status.includes('paid') || 
             status === 'ja' || 
             status === 'yes' ||
             status === 'true';
    }
    // Boolean true betekent ook betaald
    if (typeof m.paymentStatus === 'boolean') {
      return m.paymentStatus === true;
    }
    return false;
  }).length;
  
  // Niet betaald is het totaal aantal leden min betaald
  const nietBetaald = members.length - betaald;
  
  return [
    { 
      name: "Betaald", 
      value: betaald,
      color: "#2ECC71" // Groen voor betaald
    },
    { 
      name: "Niet betaald", 
      value: nietBetaald,
      color: "#E74C3C" // Rood voor niet betaald
    }
  ];
}

// Analyseer lidmaatschapsgroei over de laatste 12 maanden
function analyzeMembershipGrowth(members: Member[]): any[] {
  const today = new Date();
  const results = [];

  // Genereer data voor de afgelopen 12 maanden
  for (let i = 0; i < 12; i++) {
    const monthDate = subMonths(today, i);
    const monthName = format(monthDate, 'MMM', { locale: nl });
    const monthYear = format(monthDate, 'MMM yyyy', { locale: nl });
    
    // Tel nieuwe leden deze maand
    const newMembersCount = members.filter(member => {
      if (!member.registrationDate) return false;
      const regDate = new Date(member.registrationDate);
      return regDate.getMonth() === monthDate.getMonth() && 
             regDate.getFullYear() === monthDate.getFullYear();
    }).length;

    results.unshift({
      maand: monthName,
      maand_jaar: monthYear,
      nieuwe_leden: newMembersCount
    });
  }

  return results;
}

// Bereken geschatte inkomsten per maand
function calculateMonthlyRevenue(members: Member[], contributionAmounts: Record<string, number>): any[] {
  const today = new Date();
  const results = [];

  // Bereken totale maandelijkse inkomsten met de contributie-instellingen
  const totalMonthlyRevenue = members.reduce((total, member) => {
    return total + calculateMemberRevenue(member, contributionAmounts);
  }, 0);

  // Genereer data voor de afgelopen 12 maanden (geschat op basis van huidige leden)
  for (let i = 0; i < 12; i++) {
    const monthDate = subMonths(today, i);
    const monthName = format(monthDate, 'MMM', { locale: nl });
    
    // Voor eenvoudige berekening: neem aan dat de huidige inkomsten representatief zijn
    // In een echte applicatie zou je historische gegevens moeten gebruiken
    results.unshift({
      maand: monthName,
      inkomsten: Math.round(totalMonthlyRevenue)
    });
  }

  return results;
}

export default function Rapportage() {
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("overzicht");
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterApplied, setFilterApplied] = useState(false);
  
  // State voor het beheren van bijdragebedragen
  const [showContributionSettings, setShowContributionSettings] = useState(false);
  const [contributionAmounts, setContributionAmounts] = useState({
    "regulier": 10,
    "student": 5,
    "gezin": 20,
    "verminderd tarief": 2.5,
    "erelid": 0
  });
  
  // React refs voor de grafiek componenten ten behoeve van exports
  const ageChartRef = useRef<HTMLDivElement>(null);
  const genderChartRef = useRef<HTMLDivElement>(null);
  const membershipChartRef = useRef<HTMLDivElement>(null);
  const paymentStatusChartRef = useRef<HTMLDivElement>(null);
  const paymentMethodChartRef = useRef<HTMLDivElement>(null);
  const paymentTermChartRef = useRef<HTMLDivElement>(null);
  const growthChartRef = useRef<HTMLDivElement>(null);
  const cumulativeGrowthChartRef = useRef<HTMLDivElement>(null);
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const ageGroupChartRef = useRef<HTMLDivElement>(null);

  // Haal ledendata op
  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });

  // Bereken alle statistieken voor rapportage
  const membersByAgeGroup = members ? groupMembersByAgeRange(members) : [];
  const membersByMembershipType = members ? groupMembersByMembershipType(members) : [];
  const membersByPaymentMethod = members ? groupMembersByPaymentMethod(members) : [];
  const membersByPaymentTerm = members ? groupMembersByPaymentTerm(members) : [];
  const membersByGender = members ? groupMembersByGender(members) : [];
  const membersByPaymentStatus = members ? groupMembersByPaymentStatus(members) : [];
  const membershipGrowth = members ? analyzeMembershipGrowth(members) : [];
  const monthlyRevenue = members ? calculateMonthlyRevenue(members, contributionAmounts) : [];
  
  // Lidmaatschapstypen voor de vergelijkingstab
  const membershipTypes = [
    { name: "Regulier", color: "#963E56" },
    { name: "Student", color: "#B85370" },
    { name: "Gezin", color: "#D86985" },
    { name: "Verminderd tarief", color: "#E47F95" },
    { name: "Erelid", color: "#F1ACBA" }
  ];
  
  // Demografische statistieken
  const membersByCity = members ? groupMembersByCity(members) : [];
  const membersByPostalArea = members ? groupMembersByPostalArea(members) : [];
  const membersByNationality = members ? groupMembersByNationality(members) : [];

  // Bereken het aantal leden dat stemgerechtigd is (18+)
  const eligibleVoters = members ? members.filter(member => {
    // Debug: Log voor de leeftijdsberekening
    console.log("Member:", member.firstName, member.lastName, "Birth date:", member.birthDate, "Age:", member.birthDate ? calculateAge(member.birthDate) : "unknown");
    
    // Als geboortedatum ontbreekt, controleer of stemgerechtigdFlag direct is ingesteld
    if (member.stemgerechtigd === true) return true;
    
    // Anders bereken op basis van leeftijd als geboortedatum beschikbaar is
    if (member.birthDate) {
      return calculateAge(member.birthDate) >= 18;
    }
    
    return false;
  }).length : 0;

  // Bereken gemiddelde leeftijd
  const averageAge = members && members.length > 0 
    ? Math.round(members.reduce((sum, member) => {
        return sum + (member.birthDate ? calculateAge(member.birthDate) : 0);
      }, 0) / members.length) 
    : 0;

  // Bereken totale maandelijkse inkomsten met de huidige contributie-instellingen
  const totalMonthlyRevenue = members 
    ? members.reduce((total, member) => {
        return total + calculateMemberRevenue(member, contributionAmounts);
      }, 0)
    : 0;

  // Genereer PDF data
  const pdfData = {
    title: "MEFEN Moskee Ledenrapportage",
    date: format(new Date(), 'dd-MM-yyyy'),
    totalMembers: members?.length || 0,
    eligibleVoters,
    averageAge,
    membersByAgeGroup,
    membersByGender,
    membersByMembershipType,
    membersByPaymentMethod,
    membersByPaymentTerm,
    membersByPaymentStatus,
    membershipGrowth,
    monthlyRevenue,
    totalMonthlyRevenue
  };
  
  // Functie om alle grafieken te exporteren naar één PDF bestand
  const handleExportAllCharts = async () => {
    const chartRefs = {
      'Leeftijdsgroepen': ageChartRef,
      'Geslachtsverdeling': genderChartRef,
      'Lidmaatschapstypen': membershipChartRef,
      'Betaalstatus': paymentStatusChartRef,
      'Betalingsmethodes': paymentMethodChartRef,
      'Betalingstermijnen': paymentTermChartRef,
      'Ledengroei': growthChartRef,
      'Cumulatieve Ledengroei': cumulativeGrowthChartRef,
      'Maandelijkse Inkomsten': revenueChartRef,
      'Leeftijdsgroepen Verdeling': ageGroupChartRef
    };
    
    await exportAllChartsToPDF(chartRefs, 'MEFEN-Grafieken');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Gegevens laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header section met gradient achtergrond - consistente styling met dashboard */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Rapportage</h1>
            <p className="text-white/80">
              Bekijk statistieken en rapporten over het ledenbeheer van de moskee.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overzicht" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
            <TabsTrigger value="financieel">Financieel</TabsTrigger>
            <TabsTrigger value="ledengroei">Ledengroei</TabsTrigger>
            <TabsTrigger value="demografisch">Demografisch</TabsTrigger>
            <TabsTrigger value="vergelijking">Vergelijking</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Select onValueChange={setFilterType} value={filterType || "all"}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle leden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle leden</SelectItem>
                <SelectItem value="regulier">Regulier</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="gezin">Gezin</SelectItem>
                <SelectItem value="verminderd">Verminderd tarief</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="gap-1" onClick={() => setShowPdfPreview(!showPdfPreview)}>
              {showPdfPreview ? "Verberg PDF" : "PDF bekijken"}
            </Button>
            
            <PDFDownloadLink 
              document={<MyPdfDocument data={pdfData} />} 
              fileName="MEFEN-Rapportage.pdf"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              {({ loading }) => 
                loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    PDF rapport
                  </>
                )
              }
            </PDFDownloadLink>
            
            <Button 
              variant="secondary" 
              onClick={handleExportAllCharts}
              className="inline-flex items-center gap-2 h-10 px-4"
            >
              <FileIcon className="h-4 w-4" />
              Grafieken PDF
            </Button>
          </div>
        </div>

        {/* PDF Preview sectie */}
        {showPdfPreview && (
          <div className="mb-6 border rounded-lg overflow-hidden" style={{ height: 500 }}>
            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
              <MyPdfDocument data={pdfData} />
            </PDFViewer>
          </div>
        )}

        <TabsContent value="overzicht" className="space-y-4">
          {/* Overzichtskaarten sectie */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totaal leden</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Waarvan {eligibleVoters} stemgerechtigd
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gemiddelde leeftijd</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageAge} jaar</div>
                <p className="text-xs text-muted-foreground">
                  Van leden met bekende leeftijd
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Geschatte inkomsten</CardTitle>
                <Wallet className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{Math.round(totalMonthlyRevenue)}/mnd</div>
                <p className="text-xs text-muted-foreground">
                  Gebaseerd op lidmaatschapstype
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#963E56]/20 to-[#963E56] h-2" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Betaalstatus</CardTitle>
                <CreditCard className="h-4 w-4 text-[#963E56]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(membersByPaymentStatus[0]?.value / (members?.length || 1) * 100)}%</div>
                <p className="text-xs text-muted-foreground">
                  Van leden heeft betaald
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Grafieken sectie */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="col-span-1 border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Leden per leeftijdsgroep
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => exportChartAsJPG(ageChartRef, 'leeftijdsgroepen-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full" ref={ageChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={membersByAgeGroup}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        label={{ 
                          value: 'Leeftijdsgroep', 
                          position: 'insideBottom', 
                          offset: -5 
                        }} 
                      />
                      <YAxis 
                        label={{ 
                          value: 'Aantal leden', 
                          angle: -90, 
                          position: 'insideLeft' 
                        }} 
                      />
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                        labelFormatter={(label) => `Leeftijdsgroep: ${label}`}
                      />
                      <Bar dataKey="count" name="Leden">
                        {membersByAgeGroup.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-amber-600" />
                  Verdeling per lidmaatschapstype
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(membershipChartRef, 'lidmaatschapstypen-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full" ref={membershipChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={membersByMembershipType}
                      margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120} 
                        tick={{ fill: '#4B5563', fontSize: 12 }}
                      />
                      <RechartsTooltip 
                        formatter={(value) => [`${value} leden`, 'Aantal']}
                        labelStyle={{ color: '#1F2937', fontWeight: 'bold' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.95)', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          border: 'none' 
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        name="Aantal leden"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      >
                        {membersByMembershipType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                      <Legend wrapperStyle={{ paddingTop: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1 border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Geslachtsverdeling
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(genderChartRef, 'geslachtsverdeling-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full" ref={genderChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={membersByGender} 
                        dataKey="count" 
                        nameKey="name"
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80}
                        labelLine={true}
                        label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {membersByGender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value, name) => [
                          `${value} leden (${Math.round(value / (members?.length || 1) * 100)}%)`,
                          name
                        ]}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.95)', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          border: 'none' 
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value, entry) => <span style={{ color: '#4B5563' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#963E56]/20 to-[#963E56] h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-[#963E56]" />
                  Betaalstatus
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(paymentStatusChartRef, 'betaalstatus-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full" ref={paymentStatusChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={membersByPaymentStatus} 
                        dataKey="value" 
                        nameKey="name"
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80}
                        innerRadius={40}
                        labelLine={true}
                        label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {membersByPaymentStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value, name) => [
                          `${value} leden (${Math.round(value / (members?.length || 1) * 100)}%)`,
                          name
                        ]}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.95)', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          border: 'none' 
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 10 }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financieel" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1 border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-green-600" />
                  Betalingsmethodes
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(paymentMethodChartRef, 'betalingsmethodes-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full" ref={paymentMethodChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={membersByPaymentMethod}
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        label={{
                          value: 'Aantal leden',
                          position: 'insideBottom',
                          offset: -5
                        }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={120}
                      />
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="count" name="Aantal leden per betaalmethode">
                        {membersByPaymentMethod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-purple-600" />
                  Betalingstermijnen
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(paymentTermChartRef, 'betalingstermijnen-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full" ref={paymentTermChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={membersByPaymentTerm}
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        label={{
                          value: 'Aantal leden',
                          position: 'insideBottom',
                          offset: -5
                        }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={120}
                      />
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="count" name="Aantal leden per betalingstermijn">
                        {membersByPaymentTerm.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geschatte maandelijkse inkomsten grafiek is verwijderd */}
        </TabsContent>

        <TabsContent value="ledengroei" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Ledengroei</h3>
              <p className="text-sm text-muted-foreground">
                Bekijk de ontwikkeling van het ledenbestand over tijd
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              <div className="flex flex-col">
                <Label className="mb-1">Vanaf</Label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="flex flex-col">
                <Label className="mb-1">Tot</Label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
              <div className="flex flex-col justify-end h-full">
                <Button 
                  onClick={() => {
                    // Hier kunnen we bijv. een nieuwe filter toepassen op de grafieken
                    // op basis van startDate en endDate
                    setFilterApplied(true);
                  }}
                  className="mt-5"
                  variant="outline"
                >
                  Pas toe
                </Button>
              </div>
            </div>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Nieuwe leden per maand
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => exportChartAsJPG(growthChartRef, 'nieuwe-leden-per-maand')}
                className="h-7 w-7"
                title="Download als JPG"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-80 w-full" ref={growthChartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={membershipGrowth.slice(-6)} // laatste 6 maanden
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="maand" 
                      label={{ 
                        value: 'Maand', 
                        position: 'insideBottom', 
                        offset: -10 
                      }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Aantal nieuwe leden', 
                        angle: -90, 
                        position: 'insideLeft' 
                      }}
                    />
                    <RechartsTooltip 
                      formatter={(value, name, props) => [`${value} leden`, 'Nieuwe leden']}
                      labelFormatter={(label) => `${membershipGrowth.find(m => m.maand === label)?.maand_jaar}`}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="nieuwe_leden" name="Nieuwe leden" fill="#3F37C9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 h-2" />
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-purple-600" />
                Cumulatieve ledengroei
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={membershipGrowth.slice(-12).map((month, index, arr) => {
                      // Bereken cumulatief aantal
                      const cumulative = arr.slice(0, index + 1).reduce(
                        (sum, m) => sum + m.nieuwe_leden, 
                        0
                      );
                      return { ...month, cumulatief: cumulative };
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="maand" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value, name, props) => [`${value} leden`, 'Cumulatief']}
                      labelFormatter={(label) => `${membershipGrowth.find(m => m.maand === label)?.maand_jaar}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulatief" 
                      name="Cumulatieve groei" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="demografisch" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Demografische gegevens</h3>
              <p className="text-sm text-muted-foreground">
                Bekijk geografische en demografische spreiding van leden
              </p>
            </div>
          </div>

          {/* Eerste rij: Woonplaats en postcode gebied */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  Leden per woonplaats (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={membersByCity}
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                      />
                      <Bar dataKey="count" name="Leden">
                        {membersByCity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 h-2" />
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapIcon className="h-5 w-5 mr-2 text-amber-600" />
                  Spreiding per postcodegebied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membersByPostalArea}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);

                          return (
                            <text
                              x={x}
                              y={y}
                              fill="white"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize={12}
                            >
                              {`${membersByPostalArea[index].name.substring(0, 8)} (${Math.round(percent * 100)}%)`}
                            </text>
                          );
                        }}
                      >
                        {membersByPostalArea.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} leden`, props.payload.name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tweede rij: Nationaliteiten en geslachtsverdeling */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 h-2" />
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-green-600" />
                  Nationaliteiten (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={membersByNationality}
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                      />
                      <Bar dataKey="count" name="Leden">
                        {membersByNationality.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#963E56]/20 to-[#963E56] h-2" />
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-[#963E56]" />
                  Geslachtsverdeling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membersByGender}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                      >
                        {membersByGender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <RechartsTooltip
                        formatter={(value, name, props) => [
                          `${value} leden (${Math.round(value / (members?.length || 1) * 100)}%)`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="vergelijking" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Vergelijkende visualisaties</h3>
              <p className="text-sm text-muted-foreground">
                Bekijk verschillende typen visualisaties van ledendata
              </p>
            </div>
          </div>

          {/* Eerste rij: Radar chart en Area chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                  Leeftijdsgroepen verdeling
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(ageGroupChartRef, 'leeftijdsgroepen-verdeling')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full" ref={ageGroupChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={membersByAgeGroup}
                      margin={{ top: 20, right: 20, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        label={{ 
                          value: 'Leeftijdsgroep', 
                          position: 'insideBottom', 
                          offset: -5 
                        }} 
                      />
                      <YAxis 
                        label={{ 
                          value: 'Aantal leden', 
                          angle: -90, 
                          position: 'insideLeft' 
                        }} 
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => [`${value} leden`, 'Aantal']}
                        labelFormatter={(label) => `Leeftijdsgroep: ${label}`}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="count" name="Aantal leden per leeftijdsgroep" fill="#8884d8">
                        {membersByAgeGroup.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-cyan-600" />
                  Ledengroei (cumulatief)
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(cumulativeGrowthChartRef, 'groei-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full" ref={cumulativeGrowthChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={membershipGrowth.slice(-12).map((month, index, arr) => {
                        // Bereken cumulatief aantal
                        const cumulative = arr.slice(0, index + 1).reduce(
                          (sum, m) => sum + m.nieuwe_leden, 
                          0
                        );
                        return { ...month, cumulatief: cumulative };
                      })}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="maand"
                        label={{ 
                          value: 'Maand', 
                          position: 'insideBottom', 
                          offset: -5 
                        }}  
                      />
                      <YAxis 
                        label={{ 
                          value: 'Aantal leden', 
                          angle: -90, 
                          position: 'insideLeft' 
                        }} 
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => [`${value} leden`, 'Cumulatief']}
                        labelFormatter={(label) => `${membershipGrowth.find(m => m.maand === label)?.maand_jaar}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulatief" 
                        name="Cumulatieve groei" 
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#colorCumulative)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tweede rij: Scatterplot en Stacked Bar Chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-amber-600" />
                  Betaalmethode per type lidmaatschap
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(paymentMethodChartRef, 'betaalmethodes-grafiek')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full" ref={paymentMethodChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={membershipTypes.map(type => {
                        const typeMembers = members?.filter(m => 
                          m.membershipType?.toLowerCase() === type.name.toLowerCase()
                        ) || [];
                        
                        // Tel betaalmethodes binnen dit type
                        const autoIncasso = typeMembers.filter(m => 
                          m.paymentMethod?.toLowerCase() === "automatische incasso"
                        ).length;
                        
                        const overschrijving = typeMembers.filter(m => 
                          m.paymentMethod?.toLowerCase() === "overschrijving"
                        ).length;
                        
                        const contant = typeMembers.filter(m => 
                          m.paymentMethod?.toLowerCase() === "contant"
                        ).length;
                        
                        const anders = typeMembers.filter(m => 
                          !m.paymentMethod || 
                          !["automatische incasso", "overschrijving", "contant"].includes(
                            m.paymentMethod.toLowerCase()
                          )
                        ).length;
                        
                        return {
                          name: type.name,
                          "Automatische incasso": autoIncasso,
                          "Overschrijving": overschrijving,
                          "Contant": contant,
                          "Anders": anders,
                          total: typeMembers.length
                        };
                      })}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        label={{ 
                          value: 'Lidmaatschapstype', 
                          position: 'insideBottom', 
                          offset: -5 
                        }}  
                      />
                      <YAxis 
                        label={{ 
                          value: 'Aantal leden', 
                          angle: -90, 
                          position: 'insideLeft' 
                        }} 
                      />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ paddingTop: 10 }} />
                      <Bar dataKey="Automatische incasso" stackId="a" fill="#2ECC71" />
                      <Bar dataKey="Overschrijving" stackId="a" fill="#3498DB" />
                      <Bar dataKey="Contant" stackId="a" fill="#9B59B6" />
                      <Bar dataKey="Anders" stackId="a" fill="#E67E22" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 h-2" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Betaalstatus verdeling
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => exportChartAsJPG(paymentStatusChartRef, 'betaalstatus-verdeling')}
                  className="h-7 w-7"
                  title="Download als JPG"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full" ref={paymentStatusChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membersByPaymentStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {membersByPaymentStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        formatter={(value, entry, index) => (
                          <span style={{ color: membersByPaymentStatus[index].color }}>
                            {value} ({membersByPaymentStatus[index].value} leden)
                          </span>
                        )}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => [`${value} leden`, name]}
                        labelFormatter={() => 'Betaalstatus'}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}