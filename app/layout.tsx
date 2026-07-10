import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description:
    "Futures prop firm trade journal for MNQ/MES with Heart Rate Index metrics.",
  icons: {
    apple: "/icon.svg",
    icon: "/icon.svg",
  },
  title: "Trade Logger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn(
        "dark font-sans antialiased",
        geistSans.variable,
        geistMono.variable
      )}
      lang="en"
      style={{ colorScheme: "dark" }}
    >
      <body className="h-svh overflow-hidden font-sans">
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
