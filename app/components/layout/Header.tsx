"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { logout } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { User, LogOut, Menu } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { userData } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Menu size={20} className="text-gray-700" />
      </button>
      <div className="flex-1"></div>
      
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center space-x-2 sm:space-x-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-all duration-200 group border border-gray-200/50 hover:border-gray-300 hover:shadow-sm"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all">
              <User size={18} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden sm:block">
              {userData?.name || "Usuario"}
            </span>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-in slide-in-from-top-2 duration-200 backdrop-blur-sm">
              <button
                onClick={() => {
                  router.push("/profile");
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 flex items-center space-x-3 transition-all duration-200 group"
              >
                <User size={18} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                <span>Perfil</span>
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-all duration-200 group"
              >
                <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
