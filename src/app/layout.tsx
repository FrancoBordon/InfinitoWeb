import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Infinito ∞ Regalería",
  description:
    "Regalos, joyas, perfumes y más. Tu tienda de regalos en La Rioja, Argentina.",
  keywords: [
    "Infinito",
    "Regalería",
    "joyas",
    "collares",
    "anillos",
    "perfumes",
    "indumentaria",
    "La Rioja",
    "Argentina",
  ],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${dmSans.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster richColors position="bottom-right" />
        <ShadcnToaster />
      </body>
    </html>
  );
}
