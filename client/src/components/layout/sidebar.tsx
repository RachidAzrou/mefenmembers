import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import { 
  Calendar, Users, Home, Box, 
  LogOut, Settings, ChevronLeft, ChevronRight, Menu 
} from "lucide-react";
import { useState, useEffect } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Calendar, label: "Planning", href: "/planning" },
    { icon: Users, label: "Vrijwilligers", href: "/volunteers" },
    { icon: Box, label: "Ruimtes", href: "/rooms" },
    { icon: Settings, label: "Materialen", href: "/materials" }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Mobile menu button */}
      {isMobile && collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setCollapsed(false)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}

      <div 
        className={cn(
          "fixed md:relative flex flex-col border-r bg-white/95 backdrop-blur-sm transition-all duration-300 h-screen z-50",
          collapsed ? (isMobile ? "-translate-x-full" : "w-16") : "w-64",
          isMobile && "shadow-xl"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b bg-primary/5">
          {!collapsed && (
            <img src="/static/icon-512x512.png" alt="MEFEN" className="h-8" />
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary/70 hover:text-primary hover:bg-primary/10"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-12 md:h-11",
                    location === item.href ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-primary/5 hover:text-primary",
                    collapsed && "justify-center",
                    isMobile && !collapsed && "text-base"
                  )}
                  onClick={() => isMobile && setCollapsed(true)}
                >
                  <item.icon className={cn(
                    "h-5 w-5",
                    isMobile && !collapsed && "h-6 w-6",
                    location === item.href ? "text-primary" : "text-gray-500"
                  )} />
                  {!collapsed && (
                    <span className={cn("ml-2", isMobile && "text-base")}>
                      {item.label}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}