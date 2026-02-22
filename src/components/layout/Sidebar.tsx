"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Building2,
    LayoutDashboard,
    Target,
    Users,
    Store,
    Wallet,
    PieChart as PieChartIcon,
    UploadCloud,
    Settings,
    HelpCircle,
    LogOut
} from "lucide-react";

const navigation = [
    { name: "Sales Overview", href: "/", icon: LayoutDashboard },
    { name: "Prospect Funnel", href: "/prospects", icon: Target },
    { name: "Salesman Perf.", href: "/salespeople", icon: Users },
    { name: "Dealer Perf.", href: "/dealers", icon: Store },
    { name: "Finance Analytics", href: "/finance", icon: Wallet },
    { name: "Demographics", href: "/demographics", icon: PieChartIcon },
];

const mainTools = [
    { name: "Data Upload", href: "/upload", icon: UploadCloud },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col border-r border-border bg-card">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
                <Building2 className="h-6 w-6 text-primary mr-3" />
                <span className="text-lg font-bold text-foreground">Astra Analytics</span>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">

                <div className="mb-6">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Dashboards
                    </p>
                    <nav className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group ${isActive
                                            ? 'bg-primary/20 text-primary border border-primary/20'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                                        }`}
                                >
                                    <item.icon className={`h-5 w-5 mr-3 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div>
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Data Hub
                    </p>
                    <nav className="space-y-1">
                        {mainTools.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group ${isActive
                                            ? 'bg-primary/20 text-primary border border-primary/20'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                                        }`}
                                >
                                    <item.icon className={`h-5 w-5 mr-3 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

            </div>

            <div className="border-t border-border p-4">
                <nav className="space-y-1">
                    <Link href="#" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group">
                        <Settings className="h-5 w-5 mr-3 shrink-0" />
                        Settings
                    </Link>
                    <Link href="#" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group">
                        <HelpCircle className="h-5 w-5 mr-3 shrink-0" />
                        Support
                    </Link>
                </nav>
                <div className="mt-4 px-3 flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-primary">AD</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">Admin User</p>
                        <p className="text-xs text-muted-foreground truncate">admin@astra.com</p>
                    </div>
                    <LogOut className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                </div>
            </div>
        </div>
    );
}
