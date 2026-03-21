import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { AppAtmosphere } from "@/components/ui/app-atmosphere";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PatchPilot",
  description: "Incident-to-PR verified fix agent with approval-gated execution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="relative min-h-screen overflow-x-hidden bg-background font-sans antialiased selection:bg-primary/30 selection:text-primary">
        <AppAtmosphere />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
