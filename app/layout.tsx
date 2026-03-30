import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPAutomation — Automação de RP",
  description: "Sistema de automação e análise de clipping de RP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}