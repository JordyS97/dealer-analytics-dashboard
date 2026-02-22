"use client";

import { useAuth } from "@/lib/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const pathname = usePathname();

    // Do not render Sidebar and Header on the login page
    if (pathname === "/login") {
        return <main className="flex-1 h-screen w-full bg-background">{children}</main>;
    }

    // Prevent flashing UI before redirect if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
                <Header />
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
