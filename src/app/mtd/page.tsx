"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { DollarSign, Percent, TrendingDown, Package, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
    startOfMonth, subMonths, getDate, getDaysInMonth, isValid
} from "date-fns";

export default function MTDPage() {
    const { detailSalespeople } = useData();
    const { data: rawData, loading } = detailSalespeople;

    // Table state
    const [viewMode, setViewMode] = useState<"dealer" | "salesman">("dealer");

    const {
        metrics,
        chartData,
        tableData
    } = useMemo(() => {
        if (!rawData || rawData.length === 0) {
            return {
                metrics: null,
                chartData: [],
                tableData: []
            };
        }

        // Define Time Boundaries
        const today = new Date();
        const currentMonthStart = startOfMonth(today);

        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const currentDayNum = getDate(today);
        const daysInLastMonth = getDaysInMonth(lastMonthStart);
        const lastMonthCutoffDay = Math.min(currentDayNum, daysInLastMonth);

        // Core Aggregations
        let currentNetSales = 0;
        let currentDiscount = 0;
        let currentGross = 0;
        let currentUnits = 0;

        let lastNetSales = 0;
        let lastDiscount = 0;
        let lastGross = 0;
        let lastUnits = 0;

        // Grouping Maps
        const activeDaysMap: Record<number, { day: number; currentSales: number; lastSales: number }> = {};
        for (let i = 1; i <= 31; i++) {
            activeDaysMap[i] = { day: i, currentSales: 0, lastSales: 0 };
        }

        const performanceMap: Record<string, {
            name: string;
            currNet: number; currDisc: number; currGross: number;
            lastNet: number;
        }> = {};

        const parseMoney = (val: any) => {
            const parsed = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
        };

        rawData.forEach((row: any) => {
            const dateStr = row["Tanggal Billing"] || row["Tanggal SPK"];
            if (!dateStr) return;

            const txDate = new Date(dateStr);
            if (!isValid(txDate)) return;

            const ofr = parseMoney(row["Harga OFR"]);
            const disc = parseMoney(row["Diskon Total"]);
            const net = parseMoney(row["Net Sales"] || row["Harga OFR"] - row["Diskon Total"]);

            const groupKey = viewMode === "dealer" ? (row["Nama Dealer"] || row["Kode Dealer"] || "Unknown") : (row["Nama Salesman"] || "Unknown");
            if (!performanceMap[groupKey]) performanceMap[groupKey] = { name: groupKey, currNet: 0, currDisc: 0, currGross: 0, lastNet: 0 };

            if (txDate >= currentMonthStart && txDate <= today) {
                currentNetSales += net;
                currentDiscount += disc;
                currentGross += ofr;
                currentUnits++;

                activeDaysMap[getDate(txDate)].currentSales += net;

                performanceMap[groupKey].currNet += net;
                performanceMap[groupKey].currDisc += disc;
                performanceMap[groupKey].currGross += ofr;

            } else if (txDate >= lastMonthStart && txDate.getMonth() === lastMonthStart.getMonth() && getDate(txDate) <= lastMonthCutoffDay) {
                lastNetSales += net;
                lastDiscount += disc;
                lastGross += ofr;
                lastUnits++;

                activeDaysMap[getDate(txDate)].lastSales += net;

                performanceMap[groupKey].lastNet += net;
            }
        });

        // Compute Pace Chart (Cumulative Data)
        let runningCurr = 0;
        let runningLast = 0;
        const trendData = [];
        for (let i = 1; i <= Math.max(currentDayNum, daysInLastMonth); i++) {
            runningCurr += activeDaysMap[i].currentSales;
            runningLast += activeDaysMap[i].lastSales;

            trendData.push({
                day: i,
                currentCumulative: i <= currentDayNum ? Math.round(runningCurr / 1000000) : null,
                lastCumulative: i <= daysInLastMonth ? Math.round(runningLast / 1000000) : null,
            });
        }

        // Prepare Table Data
        const parsedTable = Object.values(performanceMap)
            .filter(p => p.currNet > 0 || p.lastNet > 0)
            .map(p => {
                const changePct = p.lastNet > 0 ? ((p.currNet - p.lastNet) / p.lastNet) * 100 : 0;
                const avgDiscPct = p.currGross > 0 ? (p.currDisc / p.currGross) * 100 : 0;
                return {
                    name: p.name,
                    currNet: p.currNet,
                    lastNet: p.lastNet,
                    changePct: changePct,
                    avgDiscPct: avgDiscPct
                };
            })
            .sort((a, b) => b.currNet - a.currNet)
            .slice(0, 50);

        return {
            metrics: {
                currentNetSales,
                currentDiscount,
                avgDiscountPct: currentGross > 0 ? (currentDiscount / currentGross) * 100 : 0,
                currentUnits,

                // Comparisons
                netSalesChange: lastNetSales > 0 ? ((currentNetSales - lastNetSales) / lastNetSales) * 100 : 0,
                discountChange: lastDiscount > 0 ? ((currentDiscount - lastDiscount) / lastDiscount) * 100 : 0,
                unitsChange: lastUnits > 0 ? ((currentUnits - lastUnits) / lastUnits) * 100 : 0,

                // Required for context
                lastNetSales,
                lastDiscount,
                lastAvgDiscountPct: lastGross > 0 ? (lastDiscount / lastGross) * 100 : 0,
                lastUnits
            },
            chartData: trendData,
            tableData: parsedTable
        };
    }, [rawData, viewMode]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Computing Month-to-Date data...</p>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Package className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Sales Data Found</h2>
                <p className="text-muted-foreground max-w-sm">
                    Upload transactions with valid Date properties to view Month-to-Date analytics.
                </p>
            </div>
        );
    }

    const {
        currentNetSales, currentDiscount, avgDiscountPct, currentUnits,
        netSalesChange, discountChange, unitsChange, lastAvgDiscountPct
    } = metrics;

    const discountRateChange = avgDiscountPct - lastAvgDiscountPct; // absolute ppt difference

    const formatRp = (val: number) => `Rp ${(val / 1000000).toFixed(1)}M`;
    const renderTrendIndicator = (val: number, inverseGood = false) => {
        const isGood = inverseGood ? val <= 0 : val >= 0;
        const color = isGood ? "text-emerald-500" : "text-rose-500";
        const Icon = val >= 0 ? ArrowUpRight : ArrowDownRight;
        return (
            <div className={`flex items-center text-sm font-semibold ${color}`}>
                <Icon className="h-4 w-4 mr-1" />
                {Math.abs(val).toFixed(1)}% YoY
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Month-To-Date Performance</h1>
                <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
                    Compare current month pacing directly against the exact identical selling-day window of the previous month.
                </p>
            </div>

            {/* SECTION A: KPI COMPARISONS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Gross Net Sales (MTD)"
                    value={formatRp(currentNetSales)}
                    icon={DollarSign}
                    iconColor="text-blue-500"
                    subtitle={renderTrendIndicator(netSalesChange, false)}
                />
                <MetricCard
                    title="Total Discount (MTD)"
                    value={formatRp(currentDiscount)}
                    icon={TrendingDown}
                    iconColor="text-amber-500"
                    subtitle={renderTrendIndicator(discountChange, true)}
                />
                <MetricCard
                    title="Avg Discount % (MTD)"
                    value={`${avgDiscountPct.toFixed(2)}%`}
                    icon={Percent}
                    iconColor="text-rose-500"
                    subtitle={
                        <div className={`flex items-center text-sm font-semibold ${discountRateChange <= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {discountRateChange >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                            {Math.abs(discountRateChange).toFixed(2)} pts YoY
                        </div>
                    }
                />
                <MetricCard
                    title="Total Units (MTD)"
                    value={currentUnits.toLocaleString()}
                    icon={Package}
                    iconColor="text-emerald-500"
                    subtitle={renderTrendIndicator(unitsChange, false)}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-12 h-auto">
                {/* SECTION B: SALES PACE CHART */}
                <div className="md:col-span-12 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-base font-bold text-foreground mb-4">Sales Pace Comparison Chart (Cumulative Rp Millions)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="day"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `Day ${val}`}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}M`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                formatter={(value: any, name: string) => [`Rp ${value}M`, name === 'currentCumulative' ? 'Current Month' : 'Last Month']}
                                labelFormatter={(label) => `Day of Month: ${label}`}
                            />
                            <Legend verticalAlign="top" height={36} formatter={(value) => value === 'currentCumulative' ? 'Current Month Pacing' : 'Last Month Pacing'} />
                            <Line type="stepAfter" dataKey="lastCumulative" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            <Line type="stepAfter" dataKey="currentCumulative" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SECTION C: PERFORMANCE COMPARISON TABLE */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-foreground">Performance Comparison Leaderboard</h3>
                        <p className="text-xs text-muted-foreground mt-1">Review entity pacing across perfectly aligned monthly selling windows.</p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-md">
                        <button
                            onClick={() => setViewMode("dealer")}
                            className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${viewMode === "dealer" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Dealers
                        </button>
                        <button
                            onClick={() => setViewMode("salesman")}
                            className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${viewMode === "salesman" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Salesmen
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-3 font-medium">{viewMode === "dealer" ? "Dealer" : "Salesman"} Name</th>
                                <th className="px-6 py-3 font-medium text-right text-blue-600">MTD Net Sales</th>
                                <th className="px-6 py-3 font-medium text-right">Last Month (Same Date)</th>
                                <th className="px-6 py-3 font-medium text-right">Change %</th>
                                <th className="px-6 py-3 font-medium text-right text-amber-600">MTD Avg Disc %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {tableData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-3 font-semibold text-foreground max-w-[250px] truncate">{row.name}</td>
                                    <td className="px-6 py-3 text-right font-bold text-blue-500">{formatRp(row.currNet)}</td>
                                    <td className="px-6 py-3 text-right font-mono text-muted-foreground">{formatRp(row.lastNet)}</td>
                                    <td className="px-6 py-3 text-right">
                                        <span className={`inline-flex items-center font-bold ${row.changePct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                            {row.changePct > 0 ? "+" : ""}{row.changePct.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-amber-500">{row.avgDiscPct.toFixed(1)}%</td>
                                </tr>
                            ))}
                            {tableData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        No performance data recorded for this period.
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
