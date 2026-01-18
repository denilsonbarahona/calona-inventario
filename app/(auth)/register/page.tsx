"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/firebase/auth";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Register user in Firebase Auth
      const userCredential = await register(formData.email, formData.password);
      const user = userCredential.user;
      
      console.log("Usuario registrado en Auth:", user.uid);
      
      // Step 2: Create user document in Firestore using the UID as document ID
      // La colección 'users' se creará automáticamente si no existe
      try {
        const { createDocument } = await import("@/lib/firebase/firestore");
        
        const userData = {
          email: formData.email,
          name: formData.name,
          role: "admin",
        };
        
        await createDocument("users", userData, user.uid);
      } catch (firestoreError: any) {
        console.error("Error al crear documento en Firestore:", firestoreError);
      }

      router.push("/dashboard");
      
    } catch (err: any) {
      console.error("Error al registrar:", err);
      
      // Mensajes de error más específicos
      let errorMessage = "Error al registrar usuario";
      
      if (err.code === "auth/configuration-not-found" || err.message?.includes("CONFIGURATION_NOT_FOUND")) {
        errorMessage = "Error de configuración de Firebase. Verifica que Authentication esté habilitado en Firebase Console y que las variables de entorno estén correctas.";
      } else if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado. Intenta iniciar sesión.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "La contraseña es muy débil. Usa al menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "El email no es válido.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Error de conexión. Verifica tu conexión a internet.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-600 mb-2">Macuvi</h1>
          <p className="text-gray-600">Crear cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-purple-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
