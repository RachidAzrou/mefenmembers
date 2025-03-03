import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Grid } from "lucide-react";

export default function SufufPage() {
  const sufufRows = [
    {
      title: "1e Rij",
      description: "Voor de Imam",
      color: "bg-emerald-100 border-emerald-500"
    },
    {
      title: "2e Rij",
      description: "Voor ouderen",
      color: "bg-blue-100 border-blue-500"
    },
    {
      title: "3e Rij",
      description: "Voor volwassenen",
      color: "bg-purple-100 border-purple-500"
    },
    {
      title: "4e Rij",
      description: "Voor jongeren",
      color: "bg-amber-100 border-amber-500"
    },
    {
      title: "5e Rij",
      description: "Voor tieners",
      color: "bg-red-100 border-red-500"
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Grid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">
          Sufuf (Gebedsrijen)
        </h1>
      </div>

      {/* Description */}
      <Card className="bg-[#963E56]/5 border-none">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            De Profeet ﷺ zei: "Houd de rijen recht, want het recht houden van de rijen is deel van het perfect verrichten van het gebed." 
            (Bukhari & Muslim)
          </p>
        </CardContent>
      </Card>

      {/* Sufuf Grid */}
      <div className="grid gap-4">
        {sufufRows.map((row, index) => (
          <div 
            key={index}
            className={`p-6 rounded-lg border-2 ${row.color} relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01]`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">{row.title}</h3>
                <p className="text-sm text-muted-foreground">{row.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="relative group"
                  >
                    <div className={`w-3 h-3 rounded-full bg-[#963E56] transition-all duration-300 group-hover:scale-125 group-hover:opacity-80`} />
                    <div className={`absolute inset-0 bg-[#963E56] rounded-full animate-ping opacity-30`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-[#963E56]">Belangrijke punten</h2>
            <ul className="list-disc pl-4 space-y-3 text-sm text-muted-foreground">
              <li className="transition-all duration-300 hover:text-[#963E56]">
                Sta schouder aan schouder en voet aan voet
              </li>
              <li className="transition-all duration-300 hover:text-[#963E56]">
                Vul de rijen van voor naar achter
              </li>
              <li className="transition-all duration-300 hover:text-[#963E56]">
                Laat geen gaten tussen de biddende personen
              </li>
              <li className="transition-all duration-300 hover:text-[#963E56]">
                De beste rijen voor mannen zijn de voorste rijen
              </li>
              <li className="transition-all duration-300 hover:text-[#963E56]">
                Respecteer de aangegeven indeling voor een geordend gebed
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}