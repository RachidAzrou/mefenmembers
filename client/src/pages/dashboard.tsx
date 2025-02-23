import { WeekView } from "@/components/calendar/week-view";
import { Button } from "@/components/ui/button";
import { Calendar, Copy } from "lucide-react";

export default function Dashboard() {
  const copyPreviousWeek = () => {
    // TODO: Implement copy previous week
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={copyPreviousWeek}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Previous Week
        </Button>
      </div>
      <WeekView />
    </div>
  );
}
