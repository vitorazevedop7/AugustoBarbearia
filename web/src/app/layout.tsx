import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentSession } from "@/lib/session";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Augusto Barbearia",
  description:
    "Serviços com preço e duração, barbeiros, endereço, horário de funcionamento e contato da Augusto Barbearia. Agende seu horário pelo site.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getCurrentSession();
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${playfair.variable} motion-safe:scroll-smooth`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only z-10 bg-surface px-4 py-3 text-brand focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader user={session ? { name: session.user.name } : null} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
