"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Award, Briefcase, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { useMemo } from "react";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SalespeoplePage() {
    const { detailSalespeople } = useData();
    const { data, loading } = detailSalespeople;

    const {
        totalSales,
        totalNetSales,
        salesByMethod,
        topSalespeople
    } = useMemo(() => {
        if (!data || data.length === 0) {
            return { totalSales: 0, totalNetSales: 0, salesByMethod: [], topSalespeople: [] };
        }

        let netSalesTotal = 0;
        const methodMap: Record<string, number> = {};
        const salespersonMap: Record<string, { count: number; name: string; revenue: number }> = {};

        data.forEach((row: any) => {
            // Net Sales (or Harga OFR as fallback)
            const netSalesStr = row["Net Sales"] || row["Harga OFR"] || 0;
            const netSales = typeof netSalesStr === "string"
                ? parseFloat(netSalesStr.replace(/,/g, ''))
                : parseFloat(netSalesStr);

            if (!isNaN(netSales)) {
                netSalesTotal += netSales;
            }

            // Method
            const method = row["Metode Pembelian"] || "Unknown";
            methodMap[method] = (methodMap[method] || 0) + 1;

            // Salesperson
            const spName = row["Nama Salesman"] || "Unknown";
            if (!salespersonMap[spName]) {
                salespersonMap[spName] = { count: 0, name: spName, revenue: 0 };
            }
            salespersonMap[spName].count += 1;
            salespersonMap[spName].revenue += isNaN(netSales) ? 0 : netSales;
        });

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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Deliveries / SPK"
                    value={totalSales.toLocaleString()}
                    icon={TrendingUp}
                    trend={4.5}
                />
                <MetricCard
                    title="Total Net Sales"
                    value={`Rp ${(totalNetSales / 1000000).toFixed(1)}M`}
                    icon={DollarSign}
                />
                <MetricCard
                    title="Cash vs Credit"
                    value={salesByMethod.length > 1 ? `${Math.round((salesByMethod.find(m => m.name.toLowerCase().includes('kredit'))?.value || 0) / totalSales * 100)}%` : "100%"}
                    subtitle="Credit Dominance"
                    icon={PieChart as any}
                />
                <MetricCard
                    title="Top Performer"
                    value={topPerformer.length > 15 ? topPerformer.substring(0, 15) + "..." : topPerformer}
                    icon={Award}
                    trend={15.3} // Dummy trend
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
                                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
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
                </div>

            </div>
        </div>
    );
}
