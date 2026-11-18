import { Inter } from "next/font/google";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

config.autoAddCss = false;

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-gray-50 text-gray-900`}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
