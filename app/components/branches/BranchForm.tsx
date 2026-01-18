"use client";

import { useState } from "react";
import { Branch } from "@/types";

interface BranchFormProps {
  branch?: Branch;
  onSubmit: (data: Omit<Branch, "id" | "createdAt" | "createdBy">) => Promise<void>;
  onCancel: () => void;
}

export default function BranchForm({ branch, onSubmit, onCancel }: BranchFormProps) {
  const [formData, setFormData] = useState({
    name: branch?.name || "",
    address: branch?.address || "",
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
      await onSubmit({
        name: formData.name,
        address: formData.address || undefined,
      });
    } catch (err: any) {
      setError(err.message || "Error al guardar sucursal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg shadow-sm">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md"
          placeholder="Nombre de la sucursal"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
          Dirección
        </label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md resize-none"
          placeholder="Dirección de la sucursal"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5"
        >
          {loading ? "Guardando..." : branch ? "Actualizar" : "Crear"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-semibold"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
