"use client";

import { useState } from "react";
import { Warehouse } from "@/types";

interface WarehouseFormProps {
  warehouse?: Warehouse;
  onSubmit: (data: Omit<Warehouse, "id" | "createdAt" | "createdBy">) => Promise<void>;
  onCancel: () => void;
}

export default function WarehouseForm({ warehouse, onSubmit, onCancel }: WarehouseFormProps) {
  const [formData, setFormData] = useState({
    name: warehouse?.name || "",
    address: warehouse?.address || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Error al guardar bodega");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
          placeholder="Nombre de la bodega"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Dirección
        </label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
          placeholder="Dirección de la bodega"
        />
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Guardando..." : warehouse ? "Actualizar" : "Crear"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
