import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import {
  LogOut, Menu, ChevronLeft, ChevronRight,
  User, UsersRound, Home,
  PlusCircle, FileSpreadsheet, Edit,
  Inbox, ChevronDown, ChevronUp
} from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRole } from "@/hooks/use-role";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isAdmin } = useRole();
  const currentUser = auth.currentUser || { email: "gebruiker@mefen.nl" };

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      if (isMobileView) {
        setCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      await signOut(auth);
      await logUserAction(
        UserActionTypes.LOGOUT,
        undefined,
        {
          type: "auth",
          id: userEmail || 'unknown',
          name: userEmail || 'unknown'
        }
      );
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Custom icon voor de ledenlijst (persoon met lijst)
  const PersonWithListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list">
      <circle cx="9" cy="7" r="4" />
      <path d="M14 10h7" />
      <path d="M14 14h7" />
      <path d="M14 18h7" />
      <path d="M3 18a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4" />
    </svg>
  );

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: PersonWithListIcon, label: "Ledenlijst", href: "/members" },
    { icon: PlusCircle, label: "Lid toevoegen", href: "/member-add" },
    { icon: Edit, label: "Lid bewerken", href: "/member-edit" },
    { icon: Inbox, label: "Aanvragen", href: "/member-requests" },
    { icon: FileSpreadsheet, label: "Exporteren", href: "/export" },
  ];

  const handleNavigation = (href: string) => {
    // Only collapse on mobile and when sidebar is expanded
    if (isMobile && !collapsed) {
      setCollapsed(true);
    }
  };

  return (
    <>
      {/* Mobile menu backdrop */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[998] transition-opacity duration-300"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Mobile menu button */}
      {isMobile && collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-[999] md:hidden w-12 h-12 rounded-full bg-white shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-200"
          onClick={() => setCollapsed(false)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}

      {/* Sidebar container */}
      <div
        className={cn(
          "fixed md:sticky top-0 flex flex-col border-r bg-white/95 backdrop-blur-sm transition-transform duration-300 ease-in-out h-[100dvh] z-[999]",
          collapsed ? (isMobile ? "-translate-x-full" : "w-16") : "w-[280px] sm:w-64",
          isMobile && "shadow-xl"
        )}
      >
        {/* Logo section */}
        <div className="flex h-44 items-center justify-center bg-white border-b relative overflow-hidden">
          {!collapsed && (
            <div className="w-full h-full flex items-center justify-center p-1">
              <img
                src="/mefen-logo-new.png"
                alt="MEFEN Moskee El Fath En Nassr"
                className="w-[95%] h-auto transition-opacity duration-200"
              />
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          )}
        </div>

        {/* Profile section */}
        <div className={cn(
          "border-b p-4 transition-all duration-200",
          collapsed ? "text-center" : ""
        )}>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2 inline-flex">
              <User className="h-5 w-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentUser?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {isAdmin ? "Administrator" : "Gebruiker"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menu items */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {menuItems.map((item) => (
              <div key={item.href}>
                {item.hasSubmenu ? (
                  <div className="mb-1">
                    <Button
                      variant={location === item.href || (item.submenuItems && item.submenuItems.some(subItem => location === subItem.href)) ? "secondary" : "ghost"}
                      className={cn(
                        "w-full h-14 md:h-12 relative transition-all duration-200",
                        (location === item.href || (item.submenuItems && item.submenuItems.some(subItem => location === subItem.href)))
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "hover:bg-primary/5 hover:text-primary",
                        collapsed ? "justify-center" : "justify-between",
                        isMobile && !collapsed && "text-base"
                      )}
                      onClick={item.toggleExpand}
                    >
                      <div className="flex items-center">
                        {React.createElement(item.icon, {
                          className: cn(
                            "h-6 w-6 md:h-5 md:w-5 transition-colors duration-200",
                            (location === item.href || (item.submenuItems && item.submenuItems.some(subItem => location === subItem.href)))
                              ? "text-primary" : "text-gray-500"
                          )
                        })}
                        {!collapsed && (
                          <span className={cn(
                            "ml-3 transition-opacity duration-200",
                            isMobile && "text-base font-medium"
                          )}>
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <div>
                          {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      )}
                    </Button>

                    {item.submenuItems && item.expanded && !collapsed && (
                      <div className="pl-4 space-y-1 my-1">
                        {item.submenuItems.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => handleNavigation(subItem.href)}
                          >
                            <Button
                              variant={location === subItem.href ? "secondary" : "ghost"}
                              className={cn(
                                "w-full h-10 relative transition-all duration-200",
                                location === subItem.href
                                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                                  : "hover:bg-primary/5 hover:text-primary text-gray-600",
                                "justify-start text-sm"
                              )}
                            >
                              {React.createElement(subItem.icon, {
                                className: cn(
                                  "h-4 w-4 transition-colors duration-200",
                                  location === subItem.href ? "text-primary" : "text-gray-500"
                                )
                              })}
                              <span className="ml-2">
                                {subItem.label}
                              </span>
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <Button
                      variant={location === item.href ? "secondary" : "ghost"}
                      className={cn(
                        "w-full h-14 md:h-12 relative transition-all duration-200",
                        location === item.href
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "hover:bg-primary/5 hover:text-primary",
                        collapsed ? "justify-center" : "justify-start",
                        isMobile && !collapsed && "text-base"
                      )}
                    >
                      {React.createElement(item.icon, {
                        className: cn(
                          "h-6 w-6 md:h-5 md:w-5 transition-colors duration-200",
                          location === item.href ? "text-primary" : "text-gray-500"
                        )
                      })}
                      {!collapsed && (
                        <span className={cn(
                          "ml-3 transition-opacity duration-200",
                          isMobile && "text-base font-medium"
                        )}>
                          {item.label}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer section */}
        <div className="p-2 border-t space-y-2">

          <Button
            variant="ghost"
            className={cn(
              "w-full h-14 md:h-12 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200",
              collapsed ? "justify-center" : "justify-start"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-6 w-6 md:h-5 md:w-5" />
            {!collapsed && (
              <span className="ml-3">Afmelden</span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}