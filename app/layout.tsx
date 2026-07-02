import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AuthGuard } from "@/lib/auth/AuthGuard";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { Analytics } from "@vercel/analytics/next";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lead Management System",
  description: "A simple lead management system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-screen w-full overflow-x-hidden bg-background text-foreground antialiased"> 
        <AuthProvider>
          <AuthGuard>
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
          </AuthGuard>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
