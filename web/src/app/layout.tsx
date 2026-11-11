import type { Metadata } from "next";
import { Barlow, Inter, Libre_Caslon_Text } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

// Só os botões: os títulos saíram da Barlow na #196.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-barlow",
  display: "swap",
});

// Títulos, nomes, preços e numerais: a serifada mais próxima do logo (#196).
const caslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-caslon",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "Augusto Barbearia",
  description:
    "Serviços com preço e duração, barbeiros, endereço, horário de funcionamento e contato da Augusto Barbearia. Agende seu horário pelo site.",
  openGraph: {
    siteName: "Augusto Barbearia",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${barlow.variable} ${caslon.variable} motion-safe:scroll-smooth`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only fixed top-2 left-2 z-50 bg-surface px-4 py-3 text-brand focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
