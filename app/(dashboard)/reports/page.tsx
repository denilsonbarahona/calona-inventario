"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { canViewReports } from "@/lib/utils/permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Package, ArrowRightLeft } from "lucide-react";

export default function ReportsPage() {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userData && !canViewReports(userData.role)) {
      router.push("/dashboard");
    }
  }, [userData, router]);

  const reportCards = [
    {
      title: "Reporte de Ventas",
      description: "Ver ventas por fecha, ingresos y ganancias",
      icon: BarChart3,
      href: "/reports/sales",
      color: "bg-blue-500",
    },
    {
      title: "Reporte de Transferencias",
      description: "Ver movimientos de inventario entre bodegas y sucursales",
      icon: ArrowRightLeft,
      href: "/reports/transfers",
      color: "bg-purple-500",
    },
    {
      title: "Reporte de Ganancias",
      description: "Análisis detallado de ganancias por producto",
      icon: TrendingUp,
      href: "/reports/profits",
      color: "bg-green-500",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Reportes</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className={`${report.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{report.title}</h2>
              <p className="text-gray-600 text-sm">{report.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
