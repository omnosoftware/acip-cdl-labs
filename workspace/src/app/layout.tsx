import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG para Documentos Públicos",
  description: "Assistente RAG para consultar documentos e PDFs da Expocaccer",
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
