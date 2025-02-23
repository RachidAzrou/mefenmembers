import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import { 
  Calendar, Users, Home, Box, 
  LogOut, Settings, ChevronLeft, ChevronRight 
} from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Calendar, label: "Planning", href: "/planning" },
    { icon: Users, label: "Volunteers", href: "/volunteers" },
    { icon: Box, label: "Spaces", href: "/spaces" },
    { icon: Settings, label: "Equipment", href: "/equipment" }
  ];

  return (
    <div className={cn(
      "flex flex-col border-r bg-white/95 backdrop-blur-sm transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b bg-primary/5">
        {!collapsed && (
          <img src="/mefen-logo.svg" alt="MEFEN" className="h-8" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-primary/70 hover:text-primary hover:bg-primary/10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-11",
                  location === item.href ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-primary/5 hover:text-primary",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  location === item.href ? "text-primary" : "text-gray-500"
                )} />
                {!collapsed && (
                  <span className="ml-2">{item.label}</span>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}