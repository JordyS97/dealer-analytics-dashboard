import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string | React.ReactNode;
    trend?: number; // positive for up, negative for down
    icon: LucideIcon;
    pace?: string;
}

export default function MetricCard({ title, value, subtitle, trend, icon: Icon, pace }: MetricCardProps) {
    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
            </div>
            <div>
                <p className="text-3xl font-bold text-foreground">{value}</p>

                <div className="flex items-center mt-2 flex-wrap text-sm gap-2">
                    {trend !== undefined && (
                        <span className={`font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trend > 0 ? '+' : ''}{trend}%
                        </span>
                    )}
                    {subtitle && (
                        <span className="text-muted-foreground">{subtitle}</span>
                    )}
                </div>
                {pace && (
                    <p className="text-xs text-muted-foreground mt-2 font-medium tracking-wide">
                        📈 {pace}
                    </p>
                )}
            </div>
        </div>
    );
}
