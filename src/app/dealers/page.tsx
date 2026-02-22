"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Store, MapPin, Building, Trophy, Loader2 } from "lucide-react";
import { useMemo } from "react";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function DealersPage() {
    // We use Sales Overview for Dealer Performance
    const { salesOverview } = useData();
    const { data, loading } = salesOverview;

    const {
        totalDealers,
        topDealer,
        salesByDealer,
        salesByArea,
        salesByGroup
    } = useMemo(() => {
        if (!data || data.length === 0) {
            return { totalDealers: 0, topDealer: "N/A", salesByDealer: [], salesByArea: [], salesByGroup: [] };
        }

        const dealerMap: Record<string, number> = {};
        const areaMap: Record<string, number> = {};
        const groupMap: Record<string, number> = {};

        data.forEach((row: any) => {
            // Dealer
            const dealer = row["Dealer/SO"] || "Unknown";
            dealerMap[dealer] = (dealerMap[dealer] || 0) + 1;

            // Area
            const area = row["Area Dealer"] || "Unknown";
            areaMap[area] = (areaMap[area] || 0) + 1;

            // Group
            const group = row["Grup Dealer"] || "Unknown";
            groupMap[group] = (groupMap[group] || 0) + 1;
        });

        const parsedDealers = Object.entries(dealerMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Filter top 10
        const top10Dealers = parsedDealers.slice(0, 10);

        const parsedArea = Object.entries(areaMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const parsedGroup = Object.entries(groupMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        return {
            totalDealers: parsedDealers.length,
            topDealer: parsedDealers.length > 0 ? parsedDealers[0].name : "N/A",
            salesByDealer: top10Dealers,
            salesByArea: parsedArea,
            salesByGroup: parsedGroup,
        };
    }, [data]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading dealer data...</p>
            </div>
        );
    }

    if (totalDealers === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Store className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Dealer Data Found</h2>
                <p className="text-muted-foreground max-w-sm">
                    Please upload your Sales Overview files to automatically generate dealer analytics.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Dealer Performance</h1>
                <p className="text-muted-foreground mt-1">
                    Monitor branch productivity, regional distribution, and group contributions.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Active Dealerships"
                    value={totalDealers}
                    icon={Store}
                    trend={2.1}
                />
                <MetricCard
                    title="Top Dealership"
                    value={topDealer.length > 15 ? topDealer.substring(0, 15) + "..." : topDealer}
                    icon={Trophy}
                />
                <MetricCard
                    title="Active Areas"
                    value={salesByArea.length}
                    icon={MapPin}
                />
                <MetricCard
                    title="Dealer Groups"
                    value={salesByGroup.length}
                    icon={Building}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-12">

                {/* Dealerships Bar Chart */}
                <div className="md:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-6">Top 10 Dealerships by Sales Volume</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesByDealer} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    width={180}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24}>
                                    {salesByDealer.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Area Pie Chart */}
                <div className="md:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-foreground mb-6">Sales by Geographic Area</h3>
                    <div className="flex-1 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesByArea}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {salesByArea.map((entry, index) => (
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

                {/* Group Bar Chart */}
                <div className="md:col-span-12 rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-6">Sales by Dealer Group</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesByGroup} margin={{ bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    angle={-45}
                                    textAnchor="end"
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40}>
                                    {salesByGroup.map((entry, index) => (
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
