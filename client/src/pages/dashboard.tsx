import { WeekView } from "@/components/calendar/week-view";
import { Card, CardContent } from "@/components/ui/card";
import { Package2, Users2, DoorOpen, UserCheck } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package2 className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Uitgeleende Materialen</h3>
                <p className="text-2xl font-bold text-primary">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users2 className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Totaal Vrijwilligers</h3>
                <p className="text-2xl font-bold text-primary">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DoorOpen className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Totaal Ruimtes</h3>
                <p className="text-2xl font-bold text-primary">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Actieve Vrijwilligers</h3>
                <p className="text-2xl font-bold text-primary">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WeekView />
    </div>
  );
}