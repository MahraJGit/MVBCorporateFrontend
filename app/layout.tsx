import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/features/auth/auth-context";
import { CurrencyProvider } from "@/features/currency/currency-context";
import { LocaleProvider } from "@/features/i18n/locale-context";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyVenueBooking — Corporate",
  description: "Corporate Event Management Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <LocaleProvider>
            <CurrencyProvider>
              <AuthProvider>
                {children}
                <Toaster richColors position="top-right" closeButton />
              </AuthProvider>
            </CurrencyProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
