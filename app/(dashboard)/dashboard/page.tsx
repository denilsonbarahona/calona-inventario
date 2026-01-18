"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDocuments } from "@/lib/firebase/firestore";
import { collection, query, where, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { calculateTotalSales } from "@/lib/utils/calculations";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { Sale } from "@/types";
import { Package, DollarSign } from "lucide-react";

export default function DashboardPage() {
  const { userData } = useAuth();
  const [warehousesCount, setWarehousesCount] = useState<number>(0);
  const [branchesCount, setBranchesCount] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Cargar bodegas
      const warehouses = await getDocuments("warehouses");
      setWarehousesCount(warehouses.length);

      // Cargar sucursales
      const branches = await getDocuments("branches");
      setBranchesCount(branches.length);

      // Cargar ventas del día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const salesRef = collection(db, "sales");
      const q = query(
        salesRef,
        where("soldAt", ">=", Timestamp.fromDate(today)),
        where("soldAt", "<=", Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        soldAt: convertFirestoreDate(doc.data().soldAt),
      })) as Sale[];

      const totalSales = calculateTotalSales(salesData);
      setTodaySales(totalSales);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
          Bienvenido, {userData?.name || "Usuario"}
        </h1>
        <p className="text-gray-500 text-xs lg:text-sm">Resumen general del sistema</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-white/80 backdrop-blur-sm p-4 lg:p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100/50">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Package size={20} className="text-white" />
            </div>
          </div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bodegas</h2>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl lg:text-4xl font-bold text-purple-600">
              {warehousesCount}
            </p>
          )}
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm p-4 lg:p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100/50">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
              <Package size={20} className="text-white" />
            </div>
          </div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sucursales</h2>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl lg:text-4xl font-bold text-blue-600">
              {branchesCount}
            </p>
          )}
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm p-4 lg:p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100/50 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
              <DollarSign size={20} className="text-white" />
            </div>
          </div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ventas del día</h2>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl lg:text-4xl font-bold text-emerald-600">
              ${todaySales.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
