import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { AppSessionProvider } from "@/components/providers/session-provider";

const graphik = localFont({
  src: [
    {
      path: "./fonts/Graphik-Regular-Web.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Graphik-Medium-Web.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-graphik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dr. Dropin YH Rapportering",
  description: "Automatisert rapportverktøy for yrkeshygiene",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${graphik.variable} antialiased min-h-screen flex flex-col bg-slate-50`}
      >
        <AppSessionProvider>
          <Header />
          <main className="flex-1 container mx-auto py-8 px-4">
            {children}
          </main>
        </AppSessionProvider>
      </body>
    </html>
  );
}
