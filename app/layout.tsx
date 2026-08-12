import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Architect Study Lab",
  description: "Estudia para Claude Certified Architect — Foundations con práctica activa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
