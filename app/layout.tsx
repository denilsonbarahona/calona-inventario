import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calona - Sistema de Inventario",
  description: "Sistema de gestión de inventario para bodegas y sucursales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
