"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddToWarehousePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to warehouses page after a short delay
    const timer = setTimeout(() => {
      router.push("/warehouses");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Agregar Producto a Bodega</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-800 mb-4">
          Los productos ahora se crean directamente desde la página de detalle de cada bodega.
        </p>
        <p className="text-blue-700 mb-4">
          Para agregar un producto:
        </p>
        <ol className="list-decimal list-inside text-blue-700 space-y-2 mb-4">
          <li>Ve a la lista de bodegas</li>
          <li>Selecciona la bodega donde quieres agregar el producto</li>
          <li>Haz clic en "Agregar Producto" dentro de la bodega</li>
        </ol>
        <Link
          href="/warehouses"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Ir a Bodegas
        </Link>
      </div>
    </div>
  );
}
