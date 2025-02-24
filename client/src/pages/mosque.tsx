import { Building2, PhoneCall, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Mosque() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Mijn Moskee</h1>
        </div>
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
              <p className="text-gray-600">Voorbeeldstraat 123</p>
              <p className="text-gray-600">1234 AB Amsterdam</p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg">Vrouwen Ingang</h3>
              <p className="text-gray-600">Voorbeeldstraat 125</p>
              <p className="text-gray-600">1234 AB Amsterdam</p>
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
              <p className="text-gray-600">+31 (0)20 123 4567</p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg">Email</h3>
              <p className="text-gray-600">info@mefen.nl</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
