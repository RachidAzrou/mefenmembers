import React from "react";
import { LayoutGrid, Users, Package2, CheckCircle2, DoorOpen, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WeekView } from "@/components/calendar/week-view";
import { useQuery } from "@tanstack/react-query";

type InventoryItem = {
  id: number;
  materialTypeId: number;
  stockLevel: number;
  minimumLevel: number;
  lastUpdated: string;
  materialType?: {
    name: string;
    maxCount: number;
  };
};

export default function Dashboard() {
  const [selectedBlock, setSelectedBlock] = React.useState<'materials' | 'inventory' | 'low-stock' | null>(null);

  const { data: inventory, isLoading: isLoadingInventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json() as Promise<InventoryItem[]>;
    }
  });

  if (isLoadingInventory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#963E56]" />
      </div>
    );
  }

  const lowStockItems = inventory?.filter(item => item.stockLevel <= item.minimumLevel) || [];
  const totalItems = inventory?.reduce((sum, item) => sum + item.stockLevel, 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">Dashboard</h1>
      </div>

      {/* Statistics Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('materials')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Totaal Materialen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package2 className="h-8 w-8 text-[#963E56]" />
              <div className="ml-2 sm:ml-3">
                <div className="text-lg sm:text-2xl font-bold">{totalItems}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">items in voorraad</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('inventory')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Voorraad Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DoorOpen className="h-8 w-8 text-[#963E56]" />
              <div className="ml-2 sm:ml-3">
                <div className="text-lg sm:text-2xl font-bold">{inventory?.length || 0}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">materiaal types</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('low-stock')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Lage Voorraad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-[#963E56]" />
              <div className="ml-2 sm:ml-3">
                <div className="text-lg sm:text-2xl font-bold">{lowStockItems.length}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">items bijbestellen</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={selectedBlock !== null} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              {selectedBlock === 'materials' && <Package2 className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'inventory' && <DoorOpen className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'low-stock' && <CheckCircle2 className="h-6 w-6 text-[#963E56]" />}
              <DialogTitle className="text-lg font-semibold text-[#963E56]">
                {selectedBlock === 'materials' && 'Totaal Materialen'}
                {selectedBlock === 'inventory' && 'Voorraad Overzicht'}
                {selectedBlock === 'low-stock' && 'Lage Voorraad Items'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Voorraad</TableHead>
                  <TableHead className="font-semibold">Minimum</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selectedBlock === 'low-stock' ? lowStockItems : inventory)?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.materialType?.name || 'Onbekend'}</TableCell>
                    <TableCell>{item.stockLevel}</TableCell>
                    <TableCell>{item.minimumLevel}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.stockLevel <= item.minimumLevel ? "destructive" : "default"}
                        className="rounded-full"
                      >
                        {item.stockLevel <= item.minimumLevel ? "Bijbestellen" : "Voldoende"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!inventory || inventory.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Geen voorraad items gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <WeekView />
      </div>
    </div>
  );
}