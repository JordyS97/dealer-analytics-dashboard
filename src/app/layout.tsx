import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/lib/context/DataContext";
import { AuthProvider } from "@/lib/context/AuthContext";
import ClientLayout from "@/components/layout/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dealer Analytics Dashboard",
  description: "Advanced dashboard to monitor and upload sales, prospect, and finance data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-background text-foreground">
      <body className={`${inter.className} h-full antialiased`}>
        <AuthProvider>
          <DataProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
