import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { format, addWeeks, startOfWeek, addDays } from "date-fns";
import { useState } from "react";

export function WeekView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekDays = Array.from({ length: 7 }).map((_, i) => 
    addDays(startOfWeek(currentWeek), i)
  );

  const goToPreviousWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const downloadPDF = () => {
    // TODO: Implement PDF download
  };

  const publishSchedule = () => {
    // TODO: Implement publish to HTML
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>Today</Button>
          <Button variant="outline" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={publishSchedule}>
            <Share2 className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => (
          <Card key={day.toISOString()} className="p-4">
            <div className="font-medium">
              {format(day, "EEEE")}
            </div>
            <div className="text-sm text-gray-500">
              {format(day, "MMM d")}
            </div>
            {/* Schedule items would go here */}
          </Card>
        ))}
      </div>
    </div>
  );
}
