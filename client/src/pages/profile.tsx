import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";

export default function Profile() {
  const { toast } = useToast();
  const currentUser = auth.currentUser;
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
        <h1 className="text-3xl font-bold text-primary">Profiel Instellingen</h1>
      </div>

      <div className="max-w-md space-y-4">
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
          <label className="text-sm font-medium">Naam</label>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Voer uw naam in"
          />
        </div>

        <Button
          onClick={handleUpdateProfile}
          className="bg-[#6BB85C] hover:bg-[#6BB85C]/90 text-white"
        >
          Profiel Bijwerken
        </Button>
      </div>
    </div>
  );
}
