import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRole } from "@/hooks/use-role";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/utils";

// Schema voor het zoekformulier
const searchSchema = z.object({
  searchTerm: z.string().min(1, "Voer een zoekterm in"),
  searchType: z.enum(["memberNumber", "name", "accountNumber"]),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function MemberEdit() {
  const { isAdmin } = useRole();
  const [, setLocation] = useLocation();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const queryClient = useQueryClient();

  // Zoekformulier
  const searchForm = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchTerm: "",
      searchType: "memberNumber",
    },
  });

  // Functie om leden te zoeken
  const searchMutation = useMutation({
    mutationFn: async (data: SearchFormData) => {
      setIsSearching(true);
      const response = await apiRequest("GET", "/api/members");
      if (!response.ok) {
        throw new Error("Zoeken mislukt");
      }
      const members = await response.json();
      
      // Filter de leden op basis van de zoekterm
      const filteredMembers = members.filter((member: any) => {
        const searchTerm = data.searchTerm.toLowerCase();
        
        switch(data.searchType) {
          case "memberNumber":
            // Lidnummer (exact)
            const memberNumberStr = member.memberNumber.toString().padStart(4, '0');
            return memberNumberStr === data.searchTerm;
          
          case "name":
            // Naam (partial match)
            return (
              member.firstName.toLowerCase().includes(searchTerm) ||
              member.lastName.toLowerCase().includes(searchTerm)
            );
          
          case "accountNumber":
            // Rekeningnummer (exact)
            return member.accountNumber === data.searchTerm;
          
          default:
            return false;
        }
      });
      
      setIsSearching(false);
      return filteredMembers;
    },
    onSuccess: (data) => {
      setSearchResults(data);
      if (data.length === 0) {
        toast({
          title: "Geen resultaten gevonden",
          description: "Er zijn geen leden gevonden die aan de zoekcriteria voldoen.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Zoeken mislukt",
        description: error.message,
        variant: "destructive",
      });
      setIsSearching(false);
    },
  });

  // Functie om het zoekformulier in te dienen
  const onSearchSubmit = (data: SearchFormData) => {
    searchMutation.mutate(data);
  };

  // Functie om naar de bewerkingspagina te navigeren - behandel ID als string voor Firebase compatibility
  const handleEditMember = (id: string | number) => {
    setLocation(`/member-add?id=${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header section met gradient achtergrond - responsive */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-4 sm:p-6 shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Lid zoeken
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            Zoek een lid om te bewerken op basis van lidnummer, naam of rekeningnummer
          </p>
        </div>
      </div>
        
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#963E56]" /> Zoekfunctie
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Vul de zoekcriteria in om een lid te vinden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...searchForm}>
            <form onSubmit={searchForm.handleSubmit(onSearchSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <FormField
                    control={searchForm.control}
                    name="searchType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zoeken op</FormLabel>
                        <FormControl>
                          <select
                            className="w-full h-10 px-3 py-2 bg-white border border-input rounded-md"
                            {...field}
                          >
                            <option value="memberNumber">Lidnummer</option>
                            <option value="name">Naam</option>
                            <option value="accountNumber">Rekeningnummer</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <FormField
                    control={searchForm.control}
                    name="searchTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zoekterm</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder={
                                searchForm.watch("searchType") === "memberNumber"
                                  ? "Voer lidnummer in (bijv. 0001)"
                                  : searchForm.watch("searchType") === "name"
                                  ? "Voer naam of achternaam in"
                                  : "Voer rekeningnummer in"
                              }
                              {...field}
                              className="pl-10 bg-gray-50 focus:bg-white transition-colors"
                            />
                            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSearching}
                className="w-full md:w-auto bg-[#963E56] hover:bg-[#7e3447]"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zoeken...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Zoeken
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Zoekresultaten */}
      {searchResults.length > 0 && (
        <Card className="border-none shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 h-1" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#963E56]" /> Zoekresultaten
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {searchResults.length} {searchResults.length === 1 ? "lid" : "leden"} gevonden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 text-sm font-medium text-gray-500">Lidnummer</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">Naam</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">Telefoonnummer</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">E-mail</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">{member.memberNumber.toString().padStart(4, '0')}</td>
                      <td className="p-2 text-sm font-medium">{member.firstName} {member.lastName}</td>
                      <td className="p-2 text-sm">{formatPhoneNumber(member.phoneNumber)}</td>
                      <td className="p-2 text-sm">{member.email || "-"}</td>
                      <td className="p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMember(member.id)}
                          className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs"
                        >
                          Bewerken
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}