import { useMemo, useEffect } from "react";
import { X, User, TrendingUp, DollarSign, ArrowRightCircle, Target, Calendar } from "lucide-react";
import { startOfMonth, subMonths, format } from "date-fns";

interface SalespersonProfileOverlayProps {
    isOpen: boolean;
    salesmanName: string;
    data: any[];
    onClose: () => void;
}

export default function SalespersonProfileOverlay({ isOpen, salesmanName, data, onClose }: SalespersonProfileOverlayProps) {
    const profileData = useMemo(() => {
        if (!isOpen || !data || !salesmanName) return null;

        const filtered = data.filter(r => r["Nama Salesman"] === salesmanName);
        if (filtered.length === 0) return null;

        const today = new Date();
        const currentMonthStart = startOfMonth(today);

        const parseRowDate = (val: any) => {
            if (!val) return null;
            if (val.toDate) return val.toDate();
            if (val instanceof Date) return val;
            return new Date(val);
        };

        const parseNumber = (val: any) => {
            if (!val) return 0;
            if (typeof val === "number") return isNaN(val) ? 0 : val;
            const parsed = parseFloat(String(val).replace(/,/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        };

        let mtdUnits = 0;
        let mtdNetSales = 0;
        let mtdBebanTotal = 0;
        let totalDP = 0;
        let totalTenor = 0;
        let validTenorRows = 0;

        const motorMap: Record<string, number> = {};
        const fincoyMap: Record<string, number> = {};
        const monthlyTrend: Record<string, number> = {};

        // Prepare last 4 months keys
        for (let i = 3; i >= 0; i--) {
            const m = subMonths(currentMonthStart, i);
            monthlyTrend[format(m, "MMM")] = 0;
        }

        const validRecents: any[] = [];

        filtered.forEach(row => {
            const dateVal = parseRowDate(row["Tanggal Billing"]);
            const netSales = parseNumber(row["Net Sales"] || row["Harga OFR"]);
            const dp = parseNumber(row["DP"]);
            const tenor = parseNumber(row["Tenor"]);
            const beban = parseNumber(row["Beban Dealer"] || row["Diskon Total"]);
            const motor = row["Tipe Motor"] || "Unknown";
            const fincoy = row["Nama Fincoy/Perusahaan MOP"] || row["Fincoy"] || "Cash";

            totalDP += dp;
            if (tenor > 0) {
                totalTenor += tenor;
                validTenorRows++;
            }

            if (dateVal) {
                if (dateVal >= currentMonthStart && dateVal <= today) {
                    mtdUnits++;
                    mtdNetSales += netSales;
                    mtdBebanTotal += beban;
                }

                // Trend
                if (dateVal >= startOfMonth(subMonths(today, 3))) {
                    const monthKey = format(dateVal, "MMM");
                    if (monthlyTrend[monthKey] !== undefined) {
                        monthlyTrend[monthKey]++;
                    }
                }

                validRecents.push({
                    date: dateVal,
                    motor,
                    dp,
                    netSales,
                    delivery: String(row["Status Delivery"] || "Unknown")
                });
            }

            // Mix
            motorMap[motor] = (motorMap[motor] || 0) + 1;
            fincoyMap[fincoy] = (fincoyMap[fincoy] || 0) + 1;
        });

        // Top 4 motors
        const motorMix = Object.entries(motorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, count]) => ({ name, count }));

        // Top 3 Fincoy
        const fincoyMix = Object.entries(fincoyMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        const trendArray = Object.entries(monthlyTrend).map(([month, count]) => ({ month, count }));
        const trendMax = Math.max(1, ...trendArray.map(t => t.count));

        validRecents.sort((a, b) => b.date.getTime() - a.date.getTime());
        const recent5 = validRecents.slice(0, 5);

        const avgDP = filtered.length > 0 ? totalDP / filtered.length : 0;
        const avgTenor = validTenorRows > 0 ? totalTenor / validTenorRows : 0;
        const avgBeban = mtdUnits > 0 ? mtdBebanTotal / mtdUnits : 0;

        let bebanColor = "text-emerald-500 bg-emerald-500/10";
        if (avgBeban >= 300000 && avgBeban <= 500000) bebanColor = "text-amber-500 bg-amber-500/10";
        if (avgBeban > 500000) bebanColor = "text-rose-500 bg-rose-500/10";

        return {
            dealer: filtered[0]["Nama Dealer"] || "Unknown Dealer",
            status: filtered[0]["Status Salesman"] || "Active",
            mtdUnits, mtdNetSales, avgBeban, avgDP, avgTenor,
            motorMix, fincoyMix, trendArray, trendMax, recent5,
            bebanColor
        };
    }, [isOpen, data, salesmanName]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-[400px] bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-start justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xl font-bold text-primary">{salesmanName.charAt(0)}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground leading-tight">{salesmanName}</h2>
                            <p className="text-sm text-muted-foreground">{profileData?.dealer}</p>
                            <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground uppercase tracking-wider">
                                {profileData?.status}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {profileData ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* 2. Stat row (3 cols) */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> MTD Units</p>
                                <p className="text-xl font-bold text-foreground">{profileData.mtdUnits}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Net Sales</p>
                                <p className="text-xl font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap" title={`Rp ${profileData.mtdNetSales.toLocaleString()}`}>
                                    Rp {(profileData.mtdNetSales / 1000000).toFixed(1)}M
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg border ${profileData.bebanColor}`}>
                                <p className="text-xs opacity-80 font-medium mb-1 flex items-center gap-1.5"><Target className="h-3 w-3" /> Avg Beban</p>
                                <p className="text-xl font-bold">Rp {(profileData.avgBeban / 1000).toFixed(0)}k</p>
                            </div>
                        </div>

                        {/* 3. Stat row (2 cols) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-card border border-border flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Avg DP</p>
                                    <p className="text-sm font-bold text-foreground">Rp {(profileData.avgDP / 1000000).toFixed(1)}M</p>
                                </div>
                                <ArrowRightCircle className="h-4 w-4 text-primary opacity-50" />
                            </div>
                            <div className="p-3 rounded-lg bg-card border border-border flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Avg Tenor</p>
                                    <p className="text-sm font-bold text-foreground">{profileData.avgTenor.toFixed(1)} bln</p>
                                </div>
                                <Calendar className="h-4 w-4 text-primary opacity-50" />
                            </div>
                        </div>

                        {/* 4. Motor mix horizontal bars */}
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-3">Top 4 Motor Mix</h3>
                            <div className="space-y-2">
                                {profileData.motorMix.map((motor, i) => {
                                    const maxMotor = Math.max(1, profileData.motorMix[0].count);
                                    return (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-24 text-xs text-muted-foreground truncate" title={motor.name}>{motor.name}</div>
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${(motor.count / maxMotor) * 100}%` }} />
                                            </div>
                                            <div className="w-6 text-xs text-right font-medium text-foreground">{motor.count}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 5. Fincoy Mix */}
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-3">Fincoy Preferences</h3>
                            <div className="flex flex-wrap gap-2">
                                {profileData.fincoyMix.map((f, i) => (
                                    <div key={i} className="px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-xs font-medium border border-border flex items-center gap-1.5">
                                        <span>{f.name}</span>
                                        <span className="bg-background/50 px-1.5 rounded-sm">{f.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 6. 4-Month Trend */}
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-3">Unit Volume Trend</h3>
                            <div className="flex items-end h-20 gap-2">
                                {profileData.trendArray.map((t, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full bg-primary/20 rounded-t-sm relative group flex items-end justify-center transition-all hover:bg-primary/30" style={{ height: `${Math.max(5, (t.count / profileData.trendMax) * 100)}%` }}>
                                            <span className="absolute -top-5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-1.5 py-0.5 rounded">
                                                {t.count}
                                            </span>
                                            <div className="w-full bg-primary rounded-t-sm" style={{ height: '3px' }} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase">{t.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 7. Recent 5 Transactions */}
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-3">Recent Transactions</h3>
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead className="bg-muted text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Date</th>
                                            <th className="px-3 py-2 font-medium">Motor</th>
                                            <th className="px-3 py-2 font-medium text-right">Net Sales</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {profileData.recent5.map((r, i) => (
                                            <tr key={i} className="hover:bg-muted/30">
                                                <td className="px-3 py-2 text-muted-foreground">{format(r.date, "dd MMM")}</td>
                                                <td className="px-3 py-2 font-medium truncate max-w-[100px]" title={r.motor}>{r.motor}</td>
                                                <td className="px-3 py-2 text-right">Rp {(r.netSales / 1000000).toFixed(1)}M</td>
                                            </tr>
                                        ))}
                                        {profileData.recent5.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No recent transactions.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Loading profile data...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
