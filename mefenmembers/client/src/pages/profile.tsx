import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { useRole } from "@/hooks/use-role";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, Shield, Mail, Clock, Key, Save } from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  const currentUser = auth.currentUser;
  const { isAdmin } = useRole();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");

  const handleUpdateProfile = async () => {
    if (!currentUser) return;

    try {
      await updateProfile(currentUser, {
        displayName: displayName,
      });

      toast({
        title: "Succes",
        description: "Profiel succesvol bijgewerkt",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon profiel niet bijwerken",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 p-2 rounded-lg">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Profiel Instellingen</h1>
          <p className="text-sm text-gray-500">Beheer je account en persoonlijke instellingen</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Account Informatie
            </CardTitle>
            <CardDescription>Je basis account gegevens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={currentUser?.email || ""}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Weergavenaam</label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Voer uw weergavenaam in"
                className="border-gray-200 focus:border-primary"
              />
              <p className="text-sm text-gray-500">
                Dit is de naam die andere gebruikers zullen zien
              </p>
            </div>

            <Button
              onClick={handleUpdateProfile}
              className="w-full md:w-auto bg-[#963E56] hover:bg-[#963E56]/90 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Profiel Bijwerken
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Account Details
            </CardTitle>
            <CardDescription>Details over je account en rol</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium">Rol</h3>
                <p className="text-sm text-gray-600">
                  {isAdmin ? "Administrator" : "Gebruiker"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Key className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <h3 className="font-medium">Account ID</h3>
                  <p className="text-sm text-gray-600 break-all">
                    {currentUser?.uid || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <h3 className="font-medium">Account Aangemaakt</h3>
                  <p className="text-sm text-gray-600">
                    {currentUser?.metadata.creationTime
                      ? new Date(currentUser.metadata.creationTime).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </p>
                  <h3 className="font-medium mt-3">Laatste Aanmelding</h3>
                  <p className="text-sm text-gray-600">
                    {currentUser?.metadata.lastSignInTime
                      ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}