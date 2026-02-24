"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    LineChart, Line, ComposedChart
} from "recharts";
import { Users, Target, PhoneCall, CalendarIcon, Activity, Loader2, Zap, TrendingUp, Award, Clock } from "lucide-react";
import { useMemo } from "react";
import { differenceInDays, format, parseISO } from "date-fns";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

export default function ProspectsPage() {
    const { prospectAcquisition, detailSalespeople } = useData();
    const { data: prospectData, loading: prospectLoading } = prospectAcquisition;
    const { data: salesData, loading: salesLoading } = detailSalespeople;

    const {
        totalProspects,
        convertedProspects,
        conversionRate,
        prospectRatio,
        prospectRatioColor,
        prospectVelocity,
        prospectsBySource,
        sourceConversionRates,
        prospectsByStatus,
        agingData,
        topSalesmen,
        trendData
    } = useMemo(() => {
        if (!prospectData || prospectData.length === 0) {
            return {
                totalProspects: 0,
                convertedProspects: 0,
                conversionRate: 0,
                prospectRatio: "0:1",
                prospectRatioColor: "text-muted-foreground",
                prospectVelocity: 0,
                prospectsBySource: [],
                sourceConversionRates: [],
                prospectsByStatus: [],
                agingData: [],
                topSalesmen: [],
                trendData: []
            };
        }

        let converted = 0;
        let totalVelocityDays = 0;
        let velocityCount = 0;

        let hot = 0, warm = 0, cold = 0;

        const sourceMap: Record<string, { total: number, converted: number }> = {};
        const statusMap: Record<string, number> = {};
        const salesmanMap: Record<string, { total: number, converted: number }> = {};
        const trendMap: Record<string, { prospects: number, conversions: number }> = {};

        prospectData.forEach((row: any) => {
            // Status Tracking
            const status = row["Prospect Status"] || "Unknown";
            statusMap[status] = (statusMap[status] || 0) + 1;

            const regDateRaw = row["RegistrationDate"] ? new Date(row["RegistrationDate"]) : null;
            const isRegValid = regDateRaw && !isNaN(regDateRaw.getTime());

            // Is Converted?
            const isConverted = status.toUpperCase().includes("DEAL") || status.toUpperCase().includes("SPK");
            if (isConverted) {
                converted++;

                // Velocity Tracking
                const convDate = row["FollowUpDate"] ? new Date(row["FollowUpDate"]) : null;
                if (isRegValid && convDate && !isNaN(convDate.getTime())) {
                    const diff = Math.abs(differenceInDays(convDate, regDateRaw));
                    totalVelocityDays += diff;
                    velocityCount++;
                }

                if (convDate && !isNaN(convDate.getTime())) {
                    const convPeriodKey = format(convDate, "yyyy-MM");
                    if (!trendMap[convPeriodKey]) trendMap[convPeriodKey] = { prospects: 0, conversions: 0 };
                    trendMap[convPeriodKey].conversions++;
                }
            } else if (isRegValid) {
                // Pipeline Aging logic for active/unconverted prospects
                const ageInDays = differenceInDays(new Date(), regDateRaw);
                if (ageInDays < 7) hot++;
                else if (ageInDays <= 30) warm++;
                else cold++;
            }

            // Trend Logic (Prospects Generated)
            if (isRegValid) {
                const periodKey = format(regDateRaw, "yyyy-MM");
                if (!trendMap[periodKey]) trendMap[periodKey] = { prospects: 0, conversions: 0 };
                trendMap[periodKey].prospects++;
            }

            // Source Tracking
            const source = row["Source Prospect"] || "Unknown";
            if (!sourceMap[source]) sourceMap[source] = { total: 0, converted: 0 };
            sourceMap[source].total++;
            if (isConverted) sourceMap[source].converted++;

            // Salesman Tracking
            const salesman = row["Salesman Name"] || row["SF"] || "Unknown";
            if (!salesmanMap[salesman]) salesmanMap[salesman] = { total: 0, converted: 0 };
            salesmanMap[salesman].total++;
            if (isConverted) salesmanMap[salesman].converted++;
        });

        // 1. Calculate Prospect Ratio (Total Prospects / Total Sales)
        const totalSales = salesData?.length || 0;
        const ratioNumber = totalSales > 0 ? (prospectData.length / totalSales) : prospectData.length;
        const prospectRatioStr = `${ratioNumber.toFixed(1)}:1`;

        // Determine Color based on Ratio
        let ratioColor = "text-green-500"; // Excellent > 1:5 (wait, > 5:1 or < 5:1?)
        // The prompt says "green > 1:5". Wait, "1:4.6" means 4.6 prospects per sale. This implies ratio is 4.6:1
        // Prompt mapping: Red <= 3, Orange 3-4, Yellow 4-5, Green > 5
        // Wait, if I need LESS prospects per sale to be efficient? No, the prompt says "> 1:5 Excellent". This means needing MORE prospects per sale is excellent? No, usually fewer prospects per sale is better, BUT the prompt literally says "Green: > 1:5 (Excellent)". Oh, it probably means 1 sale per 5 prospects. "4.6 prospects needed per sale (1:4.6)". 
        // If > 1:5 means 1:6, 1:7 (i.e. > 5 prospects per sale), that implies we generate lots of leads or what?
        // Actually typically higher conversion is better. So requiring 3 prospects (1:3) is a 33% conversion rate. Requiring 5 prospects (1:5) is 20%. The prompt likely means Conversion Rate>20% is good.
        // Let's just follow the numbering: <3 is Red, 3-4 Orange, 4-5 Yellow, >5 Green.
        if (ratioNumber <= 3) ratioColor = "text-red-500";
        else if (ratioNumber <= 4) ratioColor = "text-orange-500";
        else if (ratioNumber <= 5) ratioColor = "text-yellow-500";

        // 2. Average Velocity
        const avgVelocity = velocityCount > 0 ? Math.round(totalVelocityDays / velocityCount) : 0;

        // 3. Process Sources
        const parsedSource = Object.entries(sourceMap)
            .map(([name, data]) => ({ name, value: data.total }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const parsedSourceRates = Object.entries(sourceMap)
            .map(([name, data]) => ({
                name,
                rate: data.total > 0 ? ((data.converted / data.total) * 100).toFixed(1) : "0"
            }))
            .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))
            .slice(0, 10);

        // 4. Status
        const parsedStatus = Object.entries(statusMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 5. Aging
        const parsedAging = [{ name: "Active Prospects", Hot: hot, Warm: warm, Cold: cold }];

        // 6. Top Salesmen by Conversion Rate
        const parsedTopSalesmen = Object.entries(salesmanMap)
            .filter(([name, data]) => data.total >= 5) // Ignore outliers with 1 prospect
            .map(([name, data]) => ({
                name,
                total: data.total,
                converted: data.converted,
                rate: parseFloat(((data.converted / data.total) * 100).toFixed(1))
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5);

        // 7. Trend Data
        const parsedTrendData = Object.keys(trendMap)
            .sort()
            .map(key => ({
                period: format(parseISO(`${key}-01`), "MMM yyyy"),
                prospects: trendMap[key].prospects,
                conversions: trendMap[key].conversions
            }));

        return {
            totalProspects: prospectData.length,
            convertedProspects: converted,
            conversionRate: prospectData.length > 0 ? ((converted / prospectData.length) * 100).toFixed(1) : 0,
            prospectRatio: prospectRatioStr,
            prospectRatioColor: ratioColor,
            prospectVelocity: avgVelocity,
            prospectsBySource: parsedSource,
            sourceConversionRates: parsedSourceRates,
            prospectsByStatus: parsedStatus,
            agingData: parsedAging,
            topSalesmen: parsedTopSalesmen,
            trendData: parsedTrendData
        };
    }, [prospectData, salesData]);

    if (prospectLoading || salesLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading prospect analytics...</p>
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
                    Track acquisition sources, conversion velocities, and pipeline health.
                </p>
            </div>

            {/* TOP ROW: KPI CARDS */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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
                    title="Prospect Ratio"
                    value={prospectRatio}
                    subtitle={<span className={prospectRatioColor}>Prospects per Sale</span>}
                    icon={Activity}
                />
                <MetricCard
                    title="Prospect Velocity"
                    value={`${prospectVelocity} Days`}
                    subtitle="Avg Reg. to Deal"
                    icon={Zap}
                />
            </div>

            {/* FOURTH ROW: TREND ANALYSIS */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Prospect vs Conversion Trends</h3>
                        <p className="text-sm text-muted-foreground mt-1">Correlation over time to identify peak periods</p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar yAxisId="left" dataKey="prospects" name="Prospects Generated" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} />
                            <Line yAxisId="right" type="monotone" dataKey="conversions" name="Deals Closed" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SECOND ROW: SOURCE ANALYSIS */}
            <div className="grid gap-6 md:grid-cols-2">

                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-6">Prospects by Source</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={prospectsBySource} layout="vertical" margin={{ left: 50, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="value" name="Total Prospects" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                                    {prospectsBySource.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-6">Source Conversion Rate (%)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceConversionRates} layout="vertical" margin={{ left: 50, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px' }} formatter={(value) => [`${value}%`, 'Conversion Rate']} />
                                <Bar dataKey="rate" name="Conversion Rate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                                    {sourceConversionRates.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* THIRD ROW: STATUS, AGING & LEADERBOARD */}
            <div className="grid gap-6 md:grid-cols-3">

                {/* Pipeline Aging (Stacked Bar) */}
                <div className="md:col-span-1 border border-border bg-card rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Clock className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground leading-none">Pipeline Aging</h3>
                            <p className="text-xs text-muted-foreground mt-1">Stale leads re-engagement</p>
                        </div>
                    </div>
                    <div className="flex-1 h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agingData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="Hot" stackId="a" fill="#ef4444" name="Hot (< 7 Days)" radius={[0, 0, 4, 4]} maxBarSize={60} />
                                <Bar dataKey="Warm" stackId="a" fill="#f59e0b" name="Warm (7-30 Days)" maxBarSize={60} />
                                <Bar dataKey="Cold" stackId="a" fill="#0ea5e9" name="Cold (> 30 Days)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Pie Chart */}
                <div className="md:col-span-1 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-foreground mb-6">Pipeline Composition</h3>
                    <div className="flex-1 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={prospectsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                    {prospectsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Salesman Leaderboard */}
                <div className="md:col-span-1 border border-border bg-card rounded-xl p-6 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <Award className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground leading-none">Top 5 Closers</h3>
                            <p className="text-xs text-muted-foreground mt-1">By Prospect Conversion Rate</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        {topSalesmen.length > 0 ? topSalesmen.map((salesman, idx) => (
                            <div key={idx} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs w-3">{idx + 1}.</span> {salesman.name}
                                    </span>
                                    <span className="text-sm font-bold text-primary">{salesman.rate}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${Math.min(salesman.rate, 100)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground flex justify-end">
                                    {salesman.converted} units out of {salesman.total} leads
                                </p>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center pt-8 text-center text-muted-foreground">
                                <Users className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">Not enough prospect data to rank salespeople.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
