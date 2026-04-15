import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "NPN Filing Tool - Health Canada",
  description: "AI-powered Product Licence Application tool for Health Canada NPN submissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
