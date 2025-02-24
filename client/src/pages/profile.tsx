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
import { User, Shield } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Profiel Instellingen</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Informatie</CardTitle>
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
              />
              <p className="text-sm text-gray-500">
                Dit is de naam die andere gebruikers zullen zien
              </p>
            </div>

            <Button
              onClick={handleUpdateProfile}
              className="bg-[#6BB85C] hover:bg-[#6BB85C]/90 text-white"
            >
              Profiel Bijwerken
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Details over je account en rol</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">Rol</h3>
                <p className="text-sm text-gray-600">
                  {isAdmin ? "Administrator" : "Gebruiker"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Account ID</h3>
              <p className="text-sm text-gray-600 break-all">
                {currentUser?.uid || "-"}
              </p>
            </div>

            <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Laatste Aanmelding</h3>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}