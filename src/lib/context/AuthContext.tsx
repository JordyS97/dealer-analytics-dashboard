"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

type Role = "admin" | "viewer" | null;

interface AuthContextType {
    role: Role;
    login: (password: string) => boolean;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<Role>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Check local storage on mount
        const savedRole = localStorage.getItem("app_role") as Role;
        if (savedRole === "admin" || savedRole === "viewer") {
            setRole(savedRole);
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;

        // Route Protection
        if (!role && pathname !== "/login") {
            router.push("/login");
        } else if (role && pathname === "/login") {
            router.push("/");
        }
    }, [role, pathname, isInitialized, router]);

    const login = (password: string) => {
        // Ultra simple mock login
        if (password === "admin123") {
            setRole("admin");
            localStorage.setItem("app_role", "admin");
            router.push("/");
            return true;
        } else if (password === "viewer123") {
            setRole("viewer");
            localStorage.setItem("app_role", "viewer");
            router.push("/");
            return true;
        }
        return false;
    };

    const logout = () => {
        setRole(null);
        localStorage.removeItem("app_role");
        router.push("/login");
    };

    // Prevent flicker before initialization
    if (!isInitialized) return null;

    return (
        <AuthContext.Provider value={{ role, login, logout, isAuthenticated: !!role }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
