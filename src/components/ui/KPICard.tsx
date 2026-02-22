import { LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    trend?: number; // percentage (e.g., 12.5) positive or negative
    icon: LucideIcon;
    description?: string;
    isCurrency?: boolean;
}

export default function KPICard({ title, value, trend, icon: Icon, description, isCurrency }: KPICardProps) {
    const isPositive = trend && trend > 0;

    return (
        <div className="relative overflow-hidden rounded-xl bg-card border border-border p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                        {isCurrency ? "Rp " : ""}{value}
                    </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
            </div>

            {(trend !== undefined || description) && (
                <div className="mt-4 flex items-center text-sm">
                    {trend !== undefined && (
                        <span
                            className={`font-medium ${isPositive ? "text-emerald-500" : "text-rose-500"
                                }`}
                        >
                            {isPositive ? "+" : ""}{trend}%
                        </span>
                    )}
                    {description && (
                        <span className="ml-2 text-muted-foreground">{description}</span>
                    )}
                </div>
            )}

            {/* Decorative gradient blob */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-all pointer-events-none" />
        </div>
    );
}
