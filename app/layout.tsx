import AppLayout from "@/components/layout/AppLayout";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "spendsavvy - Smart Bill Splitting & Expense Management",
  description:
    "AI-powered expense tracking and bill splitting made simple. Track spending, split bills with friends, and get intelligent financial insights.",
  keywords:
    "expense tracker, bill splitting, AI finance, expense management, budget tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-gray-50">
        <AppLayout>{children}</AppLayout>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
