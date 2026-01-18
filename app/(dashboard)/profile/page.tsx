"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { changePassword } from "@/lib/firebase/auth";
import { getDocument } from "@/lib/firebase/firestore";
import { Branch } from "@/types";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";

export default function ProfilePage() {
  const { user, userData } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branchName, setBranchName] = useState<string>("");

  useEffect(() => {
    if (userData?.branchId) {
      loadBranch();
    } else {
      setBranchName("");
    }
  }, [userData?.branchId]);

  const loadBranch = async () => {
    if (!userData?.branchId) return;
    
    try {
      const branch = await getDocument("branches", userData.branchId);
      if (branch) {
        const branchData = {
          ...branch,
          createdAt: convertFirestoreDate(branch.createdAt),
        } as Branch;
        setBranchName(branchData.name);
      }
    } catch (error) {
      console.error("Error loading branch:", error);
      setBranchName("");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      await changePassword(passwordForm.newPassword);
      setMessage("Contraseña actualizada correctamente");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setError(err.message || "Error al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Mi Perfil</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Información Personal</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <p className="text-gray-900">{userData?.name || "-"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{userData?.email || user?.email || "-"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <p className="text-gray-900 capitalize">{userData?.role || "-"}</p>
          </div>
          {userData?.branchId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <p className="text-gray-900">{branchName || "Cargando..."}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Cambiar Contraseña</h2>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
