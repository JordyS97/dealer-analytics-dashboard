"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Users, Target, PhoneCall, CalendarIcon, Activity, Loader2 } from "lucide-react";
import { useMemo } from "react";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ProspectsPage() {
    const { prospectAcquisition } = useData();
    const { data, loading } = prospectAcquisition;

    const {
        totalProspects,
        convertedProspects,
        conversionRate,
        prospectsBySource,
        prospectsByStatus
    } = useMemo(() => {
        if (!data || data.length === 0) {
            return { totalProspects: 0, convertedProspects: 0, conversionRate: 0, prospectsBySource: [], prospectsByStatus: [] };
        }

        let converted = 0;
        const sourceMap: Record<string, number> = {};
        const statusMap: Record<string, number> = {};

        data.forEach((row: any) => {
            // Status
            const status = row["Prospect Status"] || "Unknown";
            statusMap[status] = (statusMap[status] || 0) + 1;

            // Simple assumption: if status implies success (e.g. "Deal", "Closed", "SPK")
            if (status.toUpperCase().includes("DEAL") || status.toUpperCase().includes("SPK")) {
                converted++;
            }

            // Source
            const source = row["Source Prospect"] || "Unknown";
            sourceMap[source] = (sourceMap[source] || 0) + 1;
        });

        const parsedSource = Object.entries(sourceMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const parsedStatus = Object.entries(statusMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return {
            totalProspects: data.length,
            convertedProspects: converted,
            conversionRate: data.length > 0 ? ((converted / data.length) * 100).toFixed(1) : 0,
            prospectsBySource: parsedSource,
            prospectsByStatus: parsedStatus,
        };
    }, [data]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading prospect data...</p>
            </div>
        );
    }

    if (totalProspects === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Target className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Prospect Data Found</h2>
                <p className="text-muted-foreground max-w-sm">
                    Please upload your Prospect Acquisition files to see the funnel analytics.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Prospect Funnel</h1>
                <p className="text-muted-foreground mt-1">
                    Track acquisition sources, lead statuses, and overall conversion health.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Prospects"
                    value={totalProspects.toLocaleString()}
                    icon={Users}
                    trend={8.2}
                />
                <MetricCard
                    title="Est. Conversions"
                    value={convertedProspects.toLocaleString()}
                    icon={Target}
                />
                <MetricCard
                    title="Conversion Rate"
                    value={`${conversionRate}%`}
                    subtitle="Avg to SPK"
                    icon={Activity}
                />
                <MetricCard
                    title="Active Follow-ups"
                    value={totalProspects - convertedProspects} // Naive assumption
                    icon={PhoneCall}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-12">

                {/* Source Bar Chart */}
                <div className="md:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-6">Prospects by Source</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={prospectsBySource} layout="vertical" margin={{ left: 50 }}>
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
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                                    {prospectsBySource.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Pie Chart */}
                <div className="md:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-foreground mb-6">Pipeline Status</h3>
                    <div className="flex-1 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={prospectsByStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {prospectsByStatus.map((entry, index) => (
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
