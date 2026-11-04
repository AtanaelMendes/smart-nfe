import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "SmartNFe — Preparação de NF-e de Exportação",
  description: "Plataforma de preparação inteligente de notas fiscais eletrônicas de exportação",
  lang: "pt-BR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased bg-gray-50 text-gray-900`}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
