import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG - ACIP/CDL Patrocínio",
  description: "Assistente RAG para consultar serviços e informações da ACIP/CDL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
