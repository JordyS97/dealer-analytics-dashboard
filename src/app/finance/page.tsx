"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area
} from "recharts";
import { DollarSign, Percent, TrendingDown, Wallet, Loader2 } from "lucide-react";
import { useMemo } from "react";

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9']; // Custom red to blue

export default function FinancePage() {
    const { detailSalespeople } = useData();
    const { data, loading } = detailSalespeople;

    const {
        totalRevenue,
        totalDiscounts,
        dealerBurden,
        financeComposition
    } = useMemo(() => {
        if (!data || data.length === 0) {
            return { totalRevenue: 0, totalDiscounts: 0, dealerBurden: 0, financeComposition: [] };
        }

        let revenue = 0;
        let disc = 0;
        let bebanAHM = 0;
        let bebanMD = 0;
        let bebanFincoy = 0;
        let bebanDealer = 0;

        const parseMoney = (val: any) => {
            const parsed = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
        };

        data.forEach((row: any) => {
            revenue += parseMoney(row["Harga OFR"] || row["Net Sales"]);
            disc += parseMoney(row["Diskon Total"]);

            bebanAHM += parseMoney(row["Beban AHM"]);
            bebanMD += parseMoney(row["Beban MD"]);
            bebanFincoy += parseMoney(row["Beban Fincoy"]);
            bebanDealer += parseMoney(row["Beban Dealer"]);
        });

        const composition = [
            { name: "Brand (AHM) Burden", value: bebanAHM },
            { name: "Main Dealer (MD) Burden", value: bebanMD },
            { name: "Finance Co Burden", value: bebanFincoy },
            { name: "Dealer Burden", value: bebanDealer },
        ].filter(item => item.value > 0);

        return {
            totalRevenue: revenue,
            totalDiscounts: disc,
            dealerBurden: bebanDealer,
            financeComposition: composition
        };
    }, [data]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading financial data...</p>
            </div>
        );
    }

    if (totalRevenue === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Wallet className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Financial Data Found</h2>
                <p className="text-muted-foreground max-w-sm">
                    Please upload your Detail Salespeople files containing Discount and Burden columns to see the financial analytics.
                </p>
            </div>
        );
    }

    const discountRate = totalRevenue > 0 ? (totalDiscounts / totalRevenue) * 100 : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Finance & Discounts</h1>
                <p className="text-muted-foreground mt-1">
                    Track gross revenues, discount impacts, and cost burdens distributed across entities.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Gross Revenue"
                    value={`Rp ${(totalRevenue / 1000000).toFixed(1)}M`}
                    icon={DollarSign}
                />
                <MetricCard
                    title="Total Discounts Given"
                    value={`Rp ${(totalDiscounts / 1000000).toFixed(1)}M`}
                    icon={TrendingDown}
                    trend={-discountRate} // Visualizing the discount size
                    subtitle="of Gross"
                />
                <MetricCard
                    title="Avg. Discount Rate"
                    value={`${discountRate.toFixed(2)}%`}
                    icon={Percent}
                />
                <MetricCard
                    title="Dealer Cost Burden"
                    value={`Rp ${(dealerBurden / 1000000).toFixed(1)}M`}
                    icon={Wallet}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-12">

                {/* Cost Burden Pie Chart */}
                <div className="md:col-span-6 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-foreground mb-6">Discount Burden Distribution</h3>
                    <div className="flex-1 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financeComposition}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {financeComposition.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => `Rp ${(Number(value) / 1000000).toFixed(1)}M`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost Burden Bar Chart */}
                <div className="md:col-span-6 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-foreground mb-6">Absolute Burden by Entity (Rp Millions)</h3>
                    <div className="flex-1 h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financeComposition} margin={{ bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    angle={-25}
                                    textAnchor="end"
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                                />
                                <Tooltip
                                    formatter={(value: any) => `Rp ${(Number(value) / 1000000).toFixed(1)}M`}
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                    {financeComposition.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
