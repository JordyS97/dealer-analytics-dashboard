import { useState, useMemo } from "react";
import { Users, Store, Bike, Building2 } from "lucide-react";
import { startOfMonth, subMonths, getDate, getDaysInMonth } from "date-fns";

interface MTDComparisonTableProps {
    data: any[];
}

type Dimension = "dealer" | "salesman" | "motor" | "fincoy";

export default function MTDComparisonTable({ data }: MTDComparisonTableProps) {
    const [dim, setDim] = useState<Dimension>("dealer");

    const tableData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const today = new Date();
        const currentMonthStart = startOfMonth(today);
        const lastMonthToday = subMonths(today, 1);
        const lastMonthStart = startOfMonth(lastMonthToday);

        // Setup 3 months boundaries
        const month0Start = currentMonthStart;
        const month1Start = startOfMonth(subMonths(today, 1));
        const month2Start = startOfMonth(subMonths(today, 2));
        const month3Start = startOfMonth(subMonths(today, 3));

        const groupMap: Record<string, any> = {};

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

        const getGroupKey = (row: any) => {
            switch (dim) {
                case "dealer": return row["Nama Dealer"] || "Unknown";
                case "salesman": return row["Nama Salesman"] || "Unknown";
                case "motor": return row["Tipe Motor"] || "Unknown";
                case "fincoy": return row["Nama Fincoy/Perusahaan MOP"] || row["Fincoy"] || "Unknown";
            }
        };

        data.forEach((row: any) => {
            const groupKey = getGroupKey(row);
            if (!groupMap[groupKey]) {
                groupMap[groupKey] = {
                    name: groupKey,
                    mtdUnits: 0,
                    lastUnits: 0,
                    mtdSales: 0,
                    mtdBebanTotal: 0,
                    spark: [0, 0, 0] // [oldest, middle, newest] => [M-2, M-1, M]
                };
            }

            const stat = groupMap[groupKey];
            const dateVal = parseRowDate(row["Tanggal Billing"]);
            const netSales = parseNumber(row["Net Sales"] || row["Harga OFR"]);
            const beban = parseNumber(row["Beban Dealer"] || row["Diskon Total"]);

            if (dateVal) {
                // MTD Comparison
                if (dateVal >= currentMonthStart && dateVal <= today) {
                    stat.mtdUnits++;
                    stat.mtdSales += netSales;
                    stat.mtdBebanTotal += beban;
                } else if (dateVal >= lastMonthStart && dateVal <= lastMonthToday) {
                    stat.lastUnits++;
                }

                // Callendar pattern for sparkline (Full months)
                if (dateVal >= month0Start) {
                    stat.spark[2]++;
                } else if (dateVal >= month1Start && dateVal < month0Start) {
                    stat.spark[1]++;
                } else if (dateVal >= month2Start && dateVal < month1Start) {
                    stat.spark[0]++;
                }
            }
        });

        const arr = Object.values(groupMap).map((stat: any) => {
            const deltaUnitsNum = stat.lastUnits > 0 ? ((stat.mtdUnits - stat.lastUnits) / stat.lastUnits) * 100 : 0;
            const avgBeban = stat.mtdUnits > 0 ? stat.mtdBebanTotal / stat.mtdUnits : 0;
            return {
                ...stat,
                deltaUnitsNum,
                avgBeban
            };
        });

        arr.sort((a, b) => b.mtdUnits - a.mtdUnits);
        return arr;
    }, [data, dim]);

    const maxSparkValue = useMemo(() => {
        let mx = 1;
        tableData.forEach(row => {
            row.spark.forEach((v: number) => { if (v > mx) mx = v; });
        });
        return mx;
    }, [tableData]);

    if (!data || data.length === 0) return null;

    return (
        <div className="col-span-12 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Multi-Dimensional Comparison (MTD)</h3>
                    <p className="text-sm text-muted-foreground">Track Pace, Margin, and Sparkline trends across 4 group dimensions.</p>
                </div>

                <div className="flex bg-muted p-1 rounded-lg flex-wrap gap-1">
                    <button onClick={() => setDim("dealer")} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dim === "dealer" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
                        <Store className="h-3.5 w-3.5" /> Dealer
                    </button>
                    <button onClick={() => setDim("salesman")} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dim === "salesman" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
                        <Users className="h-3.5 w-3.5" /> Salesman
                    </button>
                    <button onClick={() => setDim("motor")} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dim === "motor" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
                        <Bike className="h-3.5 w-3.5" /> Motor Type
                    </button>
                    <button onClick={() => setDim("fincoy")} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dim === "fincoy" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
                        <Building2 className="h-3.5 w-3.5" /> Fincoy
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-sm text-left relative">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">#</th>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium text-right">MTD Units</th>
                            <th className="px-6 py-4 font-medium text-right">Last MTD</th>
                            <th className="px-6 py-4 font-medium text-right">Δ%</th>
                            <th className="px-6 py-4 font-medium text-right">Net Sales MTD</th>
                            <th className="px-6 py-4 font-medium text-right">Avg Beban/unit</th>
                            <th className="px-6 py-4 font-medium text-center">3-Mo Trend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tableData.map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 text-muted-foreground">{i + 1}</td>
                                <td className="px-6 py-4 font-medium text-foreground">{row.name}</td>
                                <td className="px-6 py-4 text-right font-semibold">{row.mtdUnits.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-muted-foreground">{row.lastUnits.toLocaleString()}</td>
                                <td className={`px-6 py-4 text-right font-medium ${row.deltaUnitsNum > 0 ? 'text-emerald-500' : row.deltaUnitsNum < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                    {row.deltaUnitsNum > 0 ? '▲ ' : row.deltaUnitsNum < 0 ? '▼ ' : ''}{Math.abs(row.deltaUnitsNum).toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 text-right">Rp {(row.mtdSales / 1000000).toFixed(1)}M</td>
                                <td className="px-6 py-4 text-right">Rp {row.avgBeban.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-6 py-4 flex items-end justify-center h-full gap-1 pt-6">
                                    {row.spark.map((val: number, sIdx: number) => {
                                        const h = Math.max(10, (val / maxSparkValue) * 100);
                                        return (
                                            <div
                                                key={sIdx}
                                                className={`w-1.5 rounded-t-sm ${sIdx === 2 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                                style={{ height: `${h}%`, minHeight: '4px' }}
                                                title={`Vol: ${val}`}
                                            />
                                        );
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
