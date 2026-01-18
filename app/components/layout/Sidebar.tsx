"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Home,
  Package,
  ShoppingCart,
  Clock,
  Settings,
  ChevronDown,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userData } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Cerrar sidebar cuando cambia la ruta en mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      onClose();
    }
  }, [pathname]);

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu]
    );
  };

  // Definir todos los items del menú
  const allMenuItems = [
    { icon: Home, label: "Inicio", href: "/dashboard" },
    { icon: ShoppingCart, label: "Ventas", href: "/sales" },
    {
      icon: Package,
      label: "Inventario",
      href: "#",
      submenu: [
        { label: "Bodegas", href: "/warehouses" },
        { label: "Sucursales", href: "/branches" },
        { label: "Inventario Bodegas", href: "/inventory/warehouse" },
        { label: "Inventario Sucursales", href: "/inventory/branch" },
      ],
    },
    {
      icon: Clock,
      label: "Reporteria",
      href: "#",
      submenu: [
        { label: "Reportes", href: "/reports" },
        { label: "Ventas", href: "/reports/sales" },
        { label: "Transferencias", href: "/reports/transfers" },
        { label: "Ganancias", href: "/reports/profits" },
      ],
    },
    {
      icon: Settings,
      label: "Configuración",
      href: "#",
      submenu: [
        { label: "Usuarios", href: "/users" },
        { label: "Perfil", href: "/profile" },
      ],
    },
  ];

  // Filtrar items según el rol del usuario
  const menuItems = (() => {
    if (!userData) return [];
    
    if (userData.role === "cashier") {
      // Cashier solo ve: Ventas y Configuración (solo Perfil)
      return [
        { icon: ShoppingCart, label: "Ventas", href: "/sales" },
        {
          icon: Settings,
          label: "Configuración",
          href: "#",
          submenu: [
            { label: "Perfil", href: "/profile" },
          ],
        },
      ];
    }
    
    // Admin y Manager ven todo
    return allMenuItems;
  })();

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={cn(
        "w-64 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white min-h-screen fixed left-0 top-0 z-50 shadow-2xl border-r border-indigo-500/30 transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 lg:p-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 lg:mb-10 pb-4 lg:pb-6 border-b border-white/20">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="w-9 h-9 lg:w-11 lg:h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                <span className="text-white font-bold text-lg lg:text-xl">M</span>
              </div>
              <span className="text-lg lg:text-xl font-bold text-white">Macuvi</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isMenuOpen = openMenus.includes(item.label);

              if (hasSubmenu) {
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg transition-all duration-200 group",
                        isActive
                          ? "bg-white/20 backdrop-blur-sm text-white shadow-lg border border-white/30"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon size={18} className="transition-transform group-hover:scale-110" />
                        <span className="font-medium text-sm lg:text-base">{item.label}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={cn("transition-transform duration-200", isMenuOpen && "rotate-180")}
                      />
                    </button>
                    {isMenuOpen && (
                      <div className="ml-4 lg:ml-6 mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                        {item.submenu?.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.label}
                              href={subItem.href}
                              className={cn(
                                "block px-3 py-2 rounded-lg text-xs lg:text-sm transition-all duration-200 font-medium",
                                isSubActive
                                  ? "bg-white/20 text-white border-l-2 border-white shadow-sm"
                                  : "text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-1"
                              )}
                            >
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg transition-all duration-200 group font-medium",
                    isActive
                      ? "bg-white/20 backdrop-blur-sm text-white shadow-lg border border-white/30"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={18} className="transition-transform group-hover:scale-110" />
                  <span className="text-sm lg:text-base">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
