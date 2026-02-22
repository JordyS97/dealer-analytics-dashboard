"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { Building2, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const success = login(password);
        if (!success) {
            setError(true);
            setTimeout(() => setError(false), 3000);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center items-center bg-muted/30 p-4">
            <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-8 animate-in fade-in zoom-in duration-500">

                <div className="flex flex-col items-center mb-8">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-widest text-primary text-center">
                        ASTRA<span className="text-foreground">ANALYTICS</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm text-center">
                        Sign in to access dashboard reports and tools.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground ml-1">Access Token / Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${error ? 'border-destructive ring-destructive/50' : 'border-border'}`}
                                placeholder="Enter password..."
                            />
                        </div>
                        {error && <p className="text-xs text-destructive mt-1 ml-1 font-medium animate-pulse">Invalid password. Try 'admin123' or 'viewer123'.</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        Sign In The System <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-border">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">Role-Based Access Control:</span> Use <code className="bg-muted px-1 py-0.5 rounded text-primary">admin123</code> for full edit/upload permissions or <code className="bg-muted px-1 py-0.5 rounded text-primary">viewer123</code> for read-only analytical mode.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
