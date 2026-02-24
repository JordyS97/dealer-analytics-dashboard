"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, ComposedChart, Legend, Cell,
} from "recharts";
import { DollarSign, Percent, TrendingDown, Wallet, Loader2, AlertTriangle, ShieldAlert, Users, PiggyBank, Receipt, Banknote } from "lucide-react";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";

export default function FinancePage() {
    const { detailSalespeople } = useData();
    const { data: rawData, loading } = detailSalespeople;

    const {
        metrics,
        chartData
    } = useMemo(() => {
        if (!rawData || rawData.length === 0) {
            return {
                metrics: {
                    grossRevenue: 0, totalDiscount: 0, avgDiscountPct: 0, netSales: 0,
                    dealerSubsidy: 0, externalSubsidy: 0, dealerSharePct: 0, avgDiscPerUnit: 0,
                    highRiskCount: 0, dealerSubsidizedCount: 0, financeContribPct: 0, overallIntensity: 0
                },
                chartData: { burdenComposition: [], discountTrend: [], behaviorBySalesman: [], financeImpact: [], riskTransactions: [] }
            };
        }

        let grossRevenue = 0;
        let totalDiscount = 0;
        let netSales = 0;

        let dealerSubsidy = 0;
        let mdSubsidy = 0;
        let ahmSubsidy = 0;
        let fincoySubsidy = 0;

        let highRiskCount = 0;
        let dealerSubsidizedCount = 0;

        const motorMap: Record<string, any> = {};
        const trendMap: Record<string, any> = {};
        const salesmanMap: Record<string, any> = {};
        const fincoyMap: Record<string, any> = {};
        const riskTable: any[] = [];

        const parseMoney = (val: any) => {
            const parsed = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
        };

        rawData.forEach((row: any) => {
            const ofr = parseMoney(row["Harga OFR"]);
            const disc = parseMoney(row["Diskon Total"]);
            const net = parseMoney(row["Net Sales"]);

            const b_dealer = parseMoney(row["Beban Dealer"]);
            const b_md = parseMoney(row["Beban MD"]);
            const b_ahm = parseMoney(row["Beban AHM"]);
            const b_fincoy = parseMoney(row["Beban Fincoy"]);

            grossRevenue += ofr;
            totalDiscount += disc;
            netSales += net;

            dealerSubsidy += b_dealer;
            mdSubsidy += b_md;
            ahmSubsidy += b_ahm;
            fincoySubsidy += b_fincoy;

            const discPct = ofr > 0 ? disc / ofr : 0;
            if (discPct > 0.12) highRiskCount++; // >12% threshold
            if (b_dealer > 0) dealerSubsidizedCount++;

            // Chart A: Burden Composition (By Motor Type)
            const motorType = row["Tipe Motor"] || "Unknown";
            if (!motorMap[motorType]) motorMap[motorType] = { name: motorType, Dealer: 0, MD: 0, AHM: 0, Fincoy: 0, count: 0 };
            motorMap[motorType].Dealer += b_dealer;
            motorMap[motorType].MD += b_md;
            motorMap[motorType].AHM += b_ahm;
            motorMap[motorType].Fincoy += b_fincoy;
            motorMap[motorType].count++;

            // Chart B: Trend Over Time
            const dateStr = row["Tanggal Billing"] || row["Tanggal SPK"];
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    const monthKey = format(d, "yyyy-MM");
                    if (!trendMap[monthKey]) trendMap[monthKey] = { period: format(d, "MMM yyyy"), sort: monthKey, discountVal: 0, ofrVal: 0 };
                    trendMap[monthKey].discountVal += disc;
                    trendMap[monthKey].ofrVal += ofr;
                }
            }

            // Chart C: Behavior by Salesman
            const salesman = row["Nama Salesman"] || "Unknown";
            if (!salesmanMap[salesman]) salesmanMap[salesman] = { name: salesman, totalDisc: 0, totalOFR: 0, count: 0 };
            salesmanMap[salesman].totalDisc += disc;
            salesmanMap[salesman].totalOFR += ofr;
            salesmanMap[salesman].count++;

            // Chart D: Finance Impact
            const fincoy = row["Nama Fincoy/Perusahaan MOP"] || "CASH / None";
            if (!fincoyMap[fincoy]) fincoyMap[fincoy] = { name: fincoy, totalDisc: 0, totalOFR: 0, finSubsidy: 0, count: 0 };
            fincoyMap[fincoy].totalDisc += disc;
            fincoyMap[fincoy].totalOFR += ofr;
            fincoyMap[fincoy].finSubsidy += b_fincoy;
            fincoyMap[fincoy].count++;

            // Risk Table
            if (discPct > 0.12) {
                riskTable.push({
                    dealer: row["Nama Dealer"] || row["Kode Dealer"] || "-",
                    salesman: row["Nama Salesman"] || "-",
                    motor: motorType,
                    discPct: discPct * 100,
                    dealerSub: b_dealer,
                    finSub: b_fincoy,
                    date: dateStr ? format(new Date(dateStr), "dd MMM yyyy") : "-"
                });
            }
        });

        const totalTransactions = rawData.length;
        const externalSubsidy = ahmSubsidy + mdSubsidy + fincoySubsidy;

        // Parsing Chart Arrays
        const parsedComposition = Object.values(motorMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 by volume

        const parsedTrend = Object.values(trendMap)
            .sort((a, b) => a.sort.localeCompare(b.sort))
            .map(t => ({
                period: t.period,
                DiscountValue: Math.round(t.discountVal / 1000000), // in Millions
                Rate: t.ofrVal > 0 ? Number(((t.discountVal / t.ofrVal) * 100).toFixed(2)) : 0
            }));

        const parsedBehaviors = Object.values(salesmanMap)
            .map(s => ({
                name: s.name,
                AvgRate: s.totalOFR > 0 ? Number(((s.totalDisc / s.totalOFR) * 100).toFixed(2)) : 0,
                volume: s.count
            }))
            .sort((a, b) => b.AvgRate - a.AvgRate)
            .filter(s => s.volume >= 3) // Filter out noise
            .slice(0, 15);

        const parsedFinance = Object.values(fincoyMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
            .map(f => ({
                name: f.name,
                AvgRate: f.totalOFR > 0 ? Number(((f.totalDisc / f.totalOFR) * 100).toFixed(2)) : 0,
                FinSubsidy: Math.round(f.finSubsidy / 1000000), // in Millions
                Deals: f.count
            }));

        return {
            metrics: {
                grossRevenue,
                totalDiscount,
                avgDiscountPct: grossRevenue > 0 ? (totalDiscount / grossRevenue) * 100 : 0,
                netSales,
                dealerSubsidy,
                externalSubsidy,
                dealerSharePct: totalDiscount > 0 ? (dealerSubsidy / totalDiscount) * 100 : 0,
                avgDiscPerUnit: totalTransactions > 0 ? (totalDiscount / totalTransactions) : 0,
                highRiskCount,
                dealerSubsidizedCount,
                financeContribPct: totalDiscount > 0 ? (fincoySubsidy / totalDiscount) * 100 : 0,
                overallIntensity: grossRevenue > 0 ? (totalDiscount / grossRevenue) * 100 : 0
            },
            chartData: {
                burdenComposition: parsedComposition,
                discountTrend: parsedTrend,
                behaviorBySalesman: parsedBehaviors,
                financeImpact: parsedFinance,
                riskTransactions: riskTable.sort((a, b) => b.discPct - a.discPct).slice(0, 20)
            }
        };
    }, [rawData]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading financial data...</p>
            </div>
        );
    }

    if (!rawData || rawData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Wallet className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Financial Data Found</h2>
                <p className="text-muted-foreground max-w-sm">
                    No data available for the current date/region filters. Upload sales files or change global filters.
                </p>
            </div>
        );
    }

    const m = metrics;
    const formatRp = (val: number) => `Rp ${(val / 1000000).toFixed(1)}M`;
    const formatRpSmall = (val: number) => `Rp ${(val / 1000).toFixed(0)}k`;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Finance & Discount Analytics</h1>
                <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
                    Executive summary of revenue retention, mapped discount distributions, dealer subsidy burdens, and pricing risk.
                </p>
            </div>

            {/* ROW 1: Revenue Reality */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue Reality</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Gross Revenue (OFR)" value={formatRp(m.grossRevenue)} icon={Receipt} iconColor="text-blue-500" />
                    <MetricCard title="Total Discount Given" value={formatRp(m.totalDiscount)} icon={TrendingDown} iconColor="text-amber-500" />
                    <MetricCard title="Average Discount %" value={`${m.avgDiscountPct.toFixed(2)}%`} icon={Percent} iconColor="text-rose-500" />
                    <MetricCard title="Net Sales (Clean)" value={formatRp(m.netSales)} icon={Banknote} iconColor="text-emerald-500" />
                </div>
            </div>

            {/* ROW 2: Subsidy Structure */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subsidy Structure</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Dealer Subsidy" value={formatRp(m.dealerSubsidy)} icon={Wallet} iconColor="text-orange-500" subtitle="Absorbed internally" />
                    <MetricCard title="External Subsidy" value={formatRp(m.externalSubsidy)} icon={PiggyBank} iconColor="text-purple-500" subtitle="MD + AHM + Fincoy" />
                    <MetricCard title="Dealer Discount Share" value={`${m.dealerSharePct.toFixed(1)}%`} icon={Percent} iconColor="text-orange-500" subtitle="Dealer portion of Total Disc" />
                    <MetricCard title="Avg Discount per Unit" value={formatRpSmall(m.avgDiscPerUnit)} icon={DollarSign} iconColor="text-amber-500" />
                </div>
            </div>

            {/* ROW 3: Risk Control */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Risk Control</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="High Risk Deals (>12%)" value={m.highRiskCount} icon={AlertTriangle} iconColor="text-rose-500" />
                    <MetricCard title="Dealer Subsidized Units" value={m.dealerSubsidizedCount} icon={ShieldAlert} iconColor="text-orange-500" />
                    <MetricCard title="Finance Contrib. %" value={`${m.financeContribPct.toFixed(1)}%`} icon={Percent} iconColor="text-purple-500" />
                    <MetricCard title="Overall Intensity" value={`${m.overallIntensity.toFixed(2)}%`} icon={Percent} iconColor="text-rose-500" subtitle="Total Pressure on Revenue" />
                </div>
            </div>

            {/* Charts Grid Row 1 */}
            <div className="grid gap-6 md:grid-cols-12 h-auto">
                {/* Section A: Discount Burden Composition */}
                <div className="md:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-base font-bold text-foreground mb-4">Discount Burden Composition (By Motor)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.burdenComposition} margin={{ left: 10, right: 10, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                angle={-25}
                                textAnchor="end"
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                formatter={(value: any) => `Rp ${(Number(value) / 1000000).toFixed(1)}M`}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="Dealer" stackId="a" fill="#f97316" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="Fincoy" stackId="a" fill="#a855f7" />
                            <Bar dataKey="MD" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="AHM" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Section B: Trend */}
                <div className="md:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-base font-bold text-foreground mb-4">Discount Trend (Value & Rate)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData.discountTrend} margin={{ top: 10, right: -10, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="period"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                angle={-25}
                                textAnchor="end"
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}M`}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar yAxisId="left" dataKey="DiscountValue" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                            <Line yAxisId="right" type="monotone" dataKey="Rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Grid Row 2 */}
            <div className="grid gap-6 md:grid-cols-12 h-auto">
                {/* Section C: Salesman Behavior */}
                <div className="md:col-span-6 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[350px]">
                    <h3 className="text-base font-bold text-foreground mb-4">Salesman Behavior (Avg Discount %)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.behaviorBySalesman} layout="vertical" margin={{ left: -10, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                width={120}
                                tickLine={false}
                                axisLine={false}
                            />
                            <XAxis type="number" hide />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                formatter={(value: any) => `${value}%`}
                            />
                            <Bar dataKey="AvgRate" radius={[0, 4, 4, 0]} barSize={12}>
                                {chartData.behaviorBySalesman.map((entry, i) => (
                                    <Cell key={`c-${i}`} fill={entry.AvgRate > 12 ? '#ef4444' : '#f59e0b'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Section D: Finance Partner */}
                <div className="md:col-span-6 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[350px]">
                    <h3 className="text-base font-bold text-foreground mb-4">Finance Partner Impact</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData.financeImpact} margin={{ top: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                angle={-25}
                                textAnchor="end"
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}%`}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}M`}
                            />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                            <Line yAxisId="left" name="Avg Disc %" type="monotone" dataKey="AvgRate" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                            <Bar yAxisId="right" name="Finance Subsidy (Rp)" dataKey="FinSubsidy" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={40} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Section E: Risk Transactions Table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-foreground">Risk Transactions Component</h3>
                        <p className="text-xs text-muted-foreground mt-1">Transactions flagged with &gt;12% Discount Intensity.</p>
                    </div>
                    <div className="text-sm font-semibold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full">
                        {chartData.riskTransactions.length} Alerts
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Dealer</th>
                                <th className="px-6 py-3 font-medium">Salesman</th>
                                <th className="px-6 py-3 font-medium">Motor Type</th>
                                <th className="px-6 py-3 font-medium text-right text-rose-600">Disc %</th>
                                <th className="px-6 py-3 font-medium text-right">Dealer Subsidy</th>
                                <th className="px-6 py-3 font-medium text-right">Fin Subsidy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {chartData.riskTransactions.map((tx, idx) => (
                                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap text-muted-foreground font-medium">{tx.date}</td>
                                    <td className="px-6 py-3 font-semibold text-foreground max-w-[200px] truncate">{tx.dealer}</td>
                                    <td className="px-6 py-3 max-w-[200px] truncate">{tx.salesman}</td>
                                    <td className="px-6 py-3">{tx.motor}</td>
                                    <td className="px-6 py-3 text-right font-bold text-rose-500">{tx.discPct.toFixed(1)}%</td>
                                    <td className="px-6 py-3 text-right font-mono text-orange-500">{tx.dealerSub.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right font-mono text-purple-600">{tx.finSub.toLocaleString()}</td>
                                </tr>
                            ))}
                            {chartData.riskTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                                        No high risk transactions detected for the current period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
