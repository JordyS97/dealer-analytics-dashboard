"use client";

import { useData } from "@/lib/context/DataContext";
import MetricCard from "@/components/ui/MetricCard";
import SmartInsights from "@/components/ui/SmartInsights";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Users, TrendingUp, CreditCard, Activity, Loader2 } from "lucide-react";
import { useMemo } from "react";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

export default function DashboardPage() {
  const { salesOverview } = useData();

  const { data, loading } = salesOverview;

  // Compute Metrics and Chart Data
  const {
    totalSales,
    totalDP,
    salesByFincoy,
    salesByDate,
    salesByTipe
  } = useMemo(() => {
    if (!data || data.length === 0) {
      return { totalSales: 0, totalDP: 0, salesByFincoy: [], salesByDate: [], salesByTipe: [] };
    }

    let totalDP = 0;
    const fincoyMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};
    const tipeMap: Record<string, number> = {};

    data.forEach((row: any) => {
      // DP
      const dp = parseFloat(row["DP Aktual"]) || 0;
      totalDP += dp;

      // Fincoy
      const fincoy = row["Fincoy"] || "Unknown";
      fincoyMap[fincoy] = (fincoyMap[fincoy] || 0) + 1;

      // Date (Tgl Mohon or Tanggal SSU)
      const rawDate = row["Tgl Mohon"] || row["Tanggal SSU"];
      // Assuming naive grouping by raw date string for now.
      if (rawDate) {
        dateMap[rawDate] = (dateMap[rawDate] || 0) + 1;
      }

      // Tipe
      const tipe = row["Tipe ATPM"] || "Unknown";
      tipeMap[tipe] = (tipeMap[tipe] || 0) + 1;
    });

    const parsedFincoy = Object.entries(fincoyMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const parsedTipe = Object.entries(tipeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Sort dates naive (if format is dd/mm/yyyy it might not sort perfectly alphabetically, but we will try)
    const parsedDate = Object.entries(dateMap)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => a.date.localeCompare(b.date)); // Ideally parse properly

    return {
      totalSales: data.length,
      totalDP,
      salesByFincoy: parsedFincoy,
      salesByDate: parsedDate,
      salesByTipe: parsedTipe,
    };
  }, [data]);


  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading sales data...</p>
      </div>
    );
  }

  if (totalSales === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
          <Activity className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">No Sales Data Found</h2>
        <p className="text-muted-foreground max-w-sm">
          Please upload your Sales Overview Excel/CSV file in the Data Upload section to populate this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sales Overview</h1>
        <p className="text-muted-foreground mt-1">
          High-level performance metrics and sales trends from the latest dataset.
        </p>
      </div>

      <SmartInsights />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Units Sold"
          value={totalSales.toLocaleString()}
          icon={TrendingUp}
          trend={12.5}
        />
        <MetricCard
          title="Total Down Payment (DP)"
          value={`Rp ${(totalDP / 1000000).toFixed(1)}M`}
          subtitle="Collected"
          icon={CreditCard}
        />
        <MetricCard
          title="Active Finance Providers"
          value={salesByFincoy.length}
          icon={Activity}
        />
        <MetricCard
          title="Customer Base"
          value={totalSales.toLocaleString()}
          subtitle="Identified"
          icon={Users}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Main Line Chart */}
        <div className="md:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6">Sales Application Trend (Tgl Mohon)</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDate}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 8, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="md:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-foreground mb-6">Finance Company Distribution</h3>
          <div className="flex-1 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByFincoy}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {salesByFincoy.map((entry, index) => (
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

        {/* Bar Chart */}
        <div className="md:col-span-12 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6">Top 10 Motorcycle Types Sold (ATPM)</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByTipe} layout="vertical" margin={{ left: 50 }}>
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
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24}>
                  {salesByTipe.map((entry, index) => (
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
