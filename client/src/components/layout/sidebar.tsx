import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Calendar, DoorOpen,
  Package2, LogOut, Menu, ChevronLeft, ChevronRight,
  Download, Settings, FileJson
} from "lucide-react";
import { PiMosqueFill } from "react-icons/pi";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRole } from "@/hooks/use-role";
import { useNotifications } from "@/hooks/use-notifications";

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isAdmin } = useRole();
  const { unreadCount, clearUnreadCount } = useNotifications();

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Define menu items without settings (moved to bottom)
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Calendar, label: "Planning", href: "/planning" },
    { icon: Users, label: "Vrijwilligers", href: "/volunteers" },
    { icon: DoorOpen, label: "Ruimtes", href: "/rooms", adminOnly: true },
    { icon: Package2, label: "Materialen", href: "/materials" },
    { 
      icon: FileJson, 
      label: "Import/Export", 
      href: "/import-export",
      notificationCount: unreadCount
    },
    { icon: PiMosqueFill, label: "Mijn Moskee", href: "/mosque" }
  ].filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setCollapsed(true)}
        />
      )}

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
        <div className="flex h-32 items-center justify-center bg-white border-b relative">
          {!collapsed && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src="/static/Naamloos.png"
                alt="MEFEN"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {menuItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => {
                  if (item.href === '/import-export') {
                    clearUnreadCount();
                  }
                  if (isMobile) {
                    setCollapsed(true);
                  }
                }}
              >
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-12 md:h-11 relative",
                    location === item.href ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-primary/5 hover:text-primary",
                    collapsed && "justify-center",
                    isMobile && !collapsed && "text-base"
                  )}
                >
                  <item.icon
                    className={cn(
                      item.icon === PiMosqueFill ? "h-7 w-7" : "h-5 w-5",
                      isMobile && !collapsed && item.icon === PiMosqueFill ? "h-8 w-8" : "h-6 w-6",
                      location === item.href ? "text-primary" : "text-gray-500"
                    )}
                  />
                  {!collapsed && (
                    <span className={cn("ml-2", isMobile && "text-base")}>
                      {item.label}
                    </span>
                  )}
                  {item.notificationCount > 0 && (
                    <span className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full text-xs px-2 py-0.5",
                      collapsed && "right-1"
                    )}>
                      {item.notificationCount}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>

        <div className="p-2 border-t space-y-2">
          {isAdmin && (
            <Link href="/settings">
              <Button
                variant={location === "/settings" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 md:h-11",
                  location === "/settings" ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-primary/5 hover:text-primary",
                  collapsed && "justify-center"
                )}
                onClick={() => isMobile && setCollapsed(true)}
              >
                <Settings className="h-5 w-5" />
                {!collapsed && (
                  <span className="ml-2">Instellingen</span>
                )}
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-12 md:h-11 text-red-600 hover:text-red-700 hover:bg-red-50",
              collapsed && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && (
              <span className="ml-2">Afmelden</span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}