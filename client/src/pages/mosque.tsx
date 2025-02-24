import { Building2, PhoneCall, Mail, MapPin, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Mosque() {
  const [isEditing, setIsEditing] = useState(false);
  const [mosqueInfo, setMosqueInfo] = useState({
    menAddress: "Sint-Bernardsesteenweg 289",
    menCity: "2660 Hoboken",
    womenAddress: "Polostraat 59",
    womenCity: "2660 Hoboken",
    phone: "032940611",
    email: "info@mefen.be"
  });

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Succes",
      description: "Moskee informatie is bijgewerkt",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Mijn Moskee</h1>
        </div>

        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Bewerken
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Moskee Informatie Bewerken</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Mannen Ingang</h3>
                <Input 
                  value={mosqueInfo.menAddress}
                  onChange={(e) => setMosqueInfo({...mosqueInfo, menAddress: e.target.value})}
                  placeholder="Adres"
                  className="mb-2"
                />
                <Input 
                  value={mosqueInfo.menCity}
                  onChange={(e) => setMosqueInfo({...mosqueInfo, menCity: e.target.value})}
                  placeholder="Postcode en Stad"
                />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Vrouwen Ingang</h3>
                <Input 
                  value={mosqueInfo.womenAddress}
                  onChange={(e) => setMosqueInfo({...mosqueInfo, womenAddress: e.target.value})}
                  placeholder="Adres"
                  className="mb-2"
                />
                <Input 
                  value={mosqueInfo.womenCity}
                  onChange={(e) => setMosqueInfo({...mosqueInfo, womenCity: e.target.value})}
                  placeholder="Postcode en Stad"
                />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Contact Informatie</h3>
                <Input 
                  value={mosqueInfo.phone}
                  onChange={(e) => setMosqueInfo({...mosqueInfo, phone: e.target.value})}
                  placeholder="Telefoonnummer"
                  className="mb-2"
                />
                <Input 
                  value={mosqueInfo.email}
                  onChange={(e) => setMosqueInfo({...mosqueInfo, email: e.target.value})}
                  placeholder="Email"
                />
              </div>
              <Button onClick={handleSave} className="w-full">Opslaan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ingang Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ingangen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Mannen Ingang</h3>
              <p className="text-gray-600">{mosqueInfo.menAddress}</p>
              <p className="text-gray-600">{mosqueInfo.menCity}</p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg">Vrouwen Ingang</h3>
              <p className="text-gray-600">{mosqueInfo.womenAddress}</p>
              <p className="text-gray-600">{mosqueInfo.womenCity}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Contact Informatie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Telefoonnummer</h3>
              <p className="text-gray-600">{mosqueInfo.phone}</p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg">Email</h3>
              <p className="text-gray-600">{mosqueInfo.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}