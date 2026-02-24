"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Award, Briefcase, TrendingUp, DollarSign, Loader2, ArrowRightCircle, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { startOfMonth, subMonths, getDate, getDaysInMonth } from "date-fns";

import SmartAlertsPanel from "@/components/salespeople/SmartAlertsPanel";
import BebanDealerHeatTable from "@/components/salespeople/BebanDealerHeatTable";
import MTDComparisonTable from "@/components/salespeople/MTDComparisonTable";
import FincoyDealQualityTable from "@/components/salespeople/FincoyDealQualityTable";
import SalespersonProfileOverlay from "@/components/salespeople/SalespersonProfileOverlay";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SalespeoplePage() {
    const { detailSalespeople } = useData();
    const { data, loading } = detailSalespeople;
    const [selectedSalesman, setSelectedSalesman] = useState<string | null>(null);

    const {
        totalSales,
        totalNetSales,
        salesByMethod,
        topSalespeople,
        mtdStats
    } = useMemo(() => {
        if (!data || data.length === 0) {
            return { totalSales: 0, totalNetSales: 0, salesByMethod: [], topSalespeople: [], mtdStats: null };
        }

        let netSalesTotal = 0;
        const methodMap: Record<string, number> = {};
        const salespersonMap: Record<string, { count: number; name: string; revenue: number }> = {};

        // MTD variables
        const today = new Date();
        const currentMonthStart = startOfMonth(today);
        const lastMonthToday = subMonths(today, 1);
        const lastMonthStart = startOfMonth(lastMonthToday);

        const daysElapsed = Math.max(1, getDate(today));
        const daysInCurrentMonth = getDaysInMonth(today);

        let mtdCount = 0, lastMtdCount = 0;
        let mtdSales = 0, lastMtdSales = 0;
        let mtdDP = 0, lastMtdDP = 0;
        let mtdBebanTotal = 0, lastMtdBebanTotal = 0;

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

        data.forEach((row: any) => {
            // Numbers
            const netSales = parseNumber(row["Net Sales"] || row["Harga OFR"]);
            const dp = parseNumber(row["DP"]);
            // Adjust to map "Beban Dealer"
            const beban = parseNumber(row["Beban Dealer"] || row["Diskon Total"]);

            netSalesTotal += netSales;

            // Method
            const method = row["Metode Pembelian"] || "Unknown";
            methodMap[method] = (methodMap[method] || 0) + 1;

            // Salesperson
            const spName = row["Nama Salesman"] || "Unknown";
            if (!salespersonMap[spName]) {
                salespersonMap[spName] = { count: 0, name: spName, revenue: 0 };
            }
            salespersonMap[spName].count += 1;
            salespersonMap[spName].revenue += netSales;

            // MTD Calculation
            const dateVal = parseRowDate(row["Tanggal Billing"]);
            if (dateVal) {
                if (dateVal >= currentMonthStart && dateVal <= today) {
                    mtdCount++;
                    mtdSales += netSales;
                    mtdDP += dp;
                    mtdBebanTotal += beban;
                } else if (dateVal >= lastMonthStart && dateVal <= lastMonthToday) {
                    lastMtdCount++;
                    lastMtdSales += netSales;
                    lastMtdDP += dp;
                    lastMtdBebanTotal += beban;
                }
            }
        });

        const mtdBeban = mtdCount > 0 ? mtdBebanTotal / mtdCount : 0;
        const lastMtdBeban = lastMtdCount > 0 ? lastMtdBebanTotal / lastMtdCount : 0;

        const getPace = (val: number) => (val / daysElapsed) * daysInCurrentMonth;
        const getDelta = (mtd: number, last: number) => last > 0 ? ((mtd - last) / last) * 100 : 0;

        const parsedMethod = Object.entries(methodMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const parsedSalespeople = Object.values(salespersonMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalSales: data.length,
            totalNetSales: netSalesTotal,
            salesByMethod: parsedMethod,
            topSalespeople: parsedSalespeople,
            mtdStats: {
                count: { current: mtdCount, last: lastMtdCount, pace: getPace(mtdCount), delta: getDelta(mtdCount, lastMtdCount) },
                sales: { current: mtdSales, last: lastMtdSales, pace: getPace(mtdSales), delta: getDelta(mtdSales, lastMtdSales) },
                dp: { current: mtdDP, last: lastMtdDP, pace: getPace(mtdDP), delta: getDelta(mtdDP, lastMtdDP) },
                beban: { current: mtdBeban, last: lastMtdBeban, pace: getPace(mtdBeban), delta: getDelta(mtdBeban, lastMtdBeban) }
            }
        };
    }, [data]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading salesperson data...</p>
            </div>
        );
    }

    if (totalSales === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Salespeople Data Found</h2>
                <p className="text-muted-foreground max-w-sm">
                    Please upload your Detail Salespeople files to automatically generate leaderboard analytics.
                </p>
            </div>
        );
    }

    const topPerformer = topSalespeople.length > 0 ? topSalespeople[0].name : "N/A";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Salesman Performance</h1>
                <p className="text-muted-foreground mt-1">
                    Detailed metrics for individual sales performance and payment methods.
                </p>
            </div>

            <SmartAlertsPanel data={data} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Billings (MTD)"
                    value={mtdStats?.count.current.toLocaleString() || 0}
                    icon={TrendingUp}
                    subtitle={`vs ${mtdStats?.count.last.toLocaleString()} last month`}
                    trend={mtdStats ? Number(mtdStats.count.delta.toFixed(1)) : 0}
                    pace={`~${Math.round(mtdStats?.count.pace || 0).toLocaleString()} projected by EOM`}
                />
                <MetricCard
                    title="Net Sales (MTD)"
                    value={`Rp ${((mtdStats?.sales.current || 0) / 1000000).toFixed(1)}M`}
                    icon={DollarSign}
                    subtitle={`vs Rp ${((mtdStats?.sales.last || 0) / 1000000).toFixed(1)}M last month`}
                    trend={mtdStats ? Number(mtdStats.sales.delta.toFixed(1)) : 0}
                    pace={`~Rp ${((mtdStats?.sales.pace || 0) / 1000000).toFixed(1)}M projected by EOM`}
                />
                <MetricCard
                    title="Total DP (MTD)"
                    value={`Rp ${((mtdStats?.dp.current || 0) / 1000000).toFixed(1)}M`}
                    icon={ArrowRightCircle}
                    subtitle={`vs Rp ${((mtdStats?.dp.last || 0) / 1000000).toFixed(1)}M last month`}
                    trend={mtdStats ? Number(mtdStats.dp.delta.toFixed(1)) : 0}
                    pace={`~Rp ${((mtdStats?.dp.pace || 0) / 1000000).toFixed(1)}M projected by EOM`}
                />
                <MetricCard
                    title="Avg Beban Dealer/Unit (MTD)"
                    value={`Rp ${((mtdStats?.beban.current || 0) / 1000).toLocaleString()}k`}
                    icon={Target}
                    subtitle={`vs Rp ${((mtdStats?.beban.last || 0) / 1000).toLocaleString()}k last month`}
                    trend={mtdStats ? Number(mtdStats.beban.delta.toFixed(1)) : 0}
                    pace={mtdStats && mtdStats.beban.current > 500000 ? '🚨 High Discount Warning' : '✅ Healthy Margin Rate'}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-12">

                {/* Salespeople Bar Chart */}
                <div className="md:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-6">Top 10 Salespeople by Volume</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topSalespeople} layout="vertical" margin={{ left: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    width={150}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar
                                    dataKey="count"
                                    fill="#10b981"
                                    radius={[0, 4, 4, 0]}
                                    barSize={24}
                                    cursor="pointer"
                                    onClick={(dataVal: any) => setSelectedSalesman(dataVal?.name || null)}
                                >
                                    {topSalespeople.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Method Pie Chart */}
                <div className="md:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-foreground mb-6">Payment Method</h3>
                    <div className="flex-1 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesByMethod}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {salesByMethod.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <FincoyDealQualityTable data={data} />
                </div>

            </div>

            <BebanDealerHeatTable data={data} />
            <MTDComparisonTable data={data} />

            <SalespersonProfileOverlay
                isOpen={!!selectedSalesman}
                salesmanName={selectedSalesman || ""}
                data={data}
                onClose={() => setSelectedSalesman(null)}
            />
        </div>
    );
}
