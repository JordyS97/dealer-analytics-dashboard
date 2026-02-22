"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Users, UserCircle, Briefcase, GraduationCap, Loader2 } from "lucide-react";
import { useMemo } from "react";

const COLORS = ['#8b5cf6', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

export default function DemographicsPage() {
    const { salesOverview } = useData();
    const { data, loading } = salesOverview;

    const {
        totalCustomers,
        genderSplit,
        topJob,
        jobsData,
        customerTypeData
    } = useMemo(() => {
        if (!data || data.length === 0) {
            return { totalCustomers: 0, genderSplit: [], topJob: "N/A", jobsData: [], customerTypeData: [] };
        }

        const genderMap: Record<string, number> = {};
        const jobMap: Record<string, number> = {};
        const typeMap: Record<string, number> = {};

        data.forEach((row: any) => {
            // Gender ("Gender5")
            const gender = row["Gender5"] || "Unknown";
            genderMap[gender] = (genderMap[gender] || 0) + 1;

            // Job ("Pekerjaan4")
            const job = row["Pekerjaan4"] || "Unknown";
            jobMap[job] = (jobMap[job] || 0) + 1;

            // Customer Type ("Konsumen")
            const custType = row["Konsumen"] || "Unknown";
            typeMap[custType] = (typeMap[custType] || 0) + 1;
        });

        const parsedGender = Object.entries(genderMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const parsedJob = Object.entries(jobMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const parsedType = Object.entries(typeMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return {
            totalCustomers: data.length,
            genderSplit: parsedGender,
            topJob: parsedJob.length > 0 ? parsedJob[0].name : "N/A",
            jobsData: parsedJob.slice(0, 10), // Top 10 jobs
            customerTypeData: parsedType
        };
    }, [data]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading demographics data...</p>
            </div>
        );
    }

    if (totalCustomers === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Demographic Data Found</h2>
                <p className="text-muted-foreground max-w-sm">
                    Please upload your Sales Overview files containing Gender, Job, and Consumer Type columns.
                </p>
            </div>
        );
    }

    // Calculate Male/Female approx ratio if exists
    const maleCount = genderSplit.find(g => g.name.toLowerCase() === "pria" || g.name.toLowerCase() === "laki-laki" || g.name.toLowerCase() === "male")?.value || 0;
    const femaleCount = genderSplit.find(g => g.name.toLowerCase() === "wanita" || g.name.toLowerCase() === "perempuan" || g.name.toLowerCase() === "female")?.value || 0;
    const malePercentage = totalCustomers > 0 ? Math.round((maleCount / (maleCount + femaleCount || 1)) * 100) : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Customer Demographics</h1>
                <p className="text-muted-foreground mt-1">
                    Analyze your customer base across gender, occupation, and business segments.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total End Users"
                    value={totalCustomers.toLocaleString()}
                    icon={Users}
                />
                <MetricCard
                    title="Dominant Gender"
                    value={malePercentage > 50 ? "Male" : "Female"}
                    subtitle={`${Math.max(malePercentage, 100 - malePercentage)}% of total`}
                    icon={UserCircle}
                />
                <MetricCard
                    title="Most Common Job"
                    value={topJob.length > 15 ? topJob.substring(0, 15) + "..." : topJob}
                    icon={Briefcase}
                />
                <MetricCard
                    title="Customer Segments"
                    value={customerTypeData.length}
                    icon={GraduationCap}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-12">

                {/* Jobs Bar Chart */}
                <div className="md:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-6">Top Occupations</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={jobsData} layout="vertical" margin={{ left: 100 }}>
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
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                                    {jobsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="md:col-span-4 flex flex-col gap-6">
                    {/* Gender Pie Chart */}
                    <div className="flex-1 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-foreground mb-2">Gender Distribution</h3>
                        <div className="flex-1 min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genderSplit}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={65}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {genderSplit.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={20} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Customer Type Pie Chart */}
                    <div className="flex-1 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-foreground mb-2">Segment Type</h3>
                        <div className="flex-1 min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={customerTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={65}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {customerTypeData.map((entry, index) => (
                                            // Start picking colors from end of array to contrast with top pie
                                            <Cell key={`cell-${index}`} fill={COLORS[(COLORS.length - 1 - index) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={20} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
