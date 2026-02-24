import { useState, useMemo } from "react";
import { Users, Store } from "lucide-react";

interface BebanDealerHeatTableProps {
    data: any[];
}

export default function BebanDealerHeatTable({ data }: BebanDealerHeatTableProps) {
    const [groupField, setGroupField] = useState<"Nama Salesman" | "Nama Dealer">("Nama Salesman");

    const { tableData, teamAvg } = useMemo(() => {
        if (!data || data.length === 0) return { tableData: [], teamAvg: 0 };

        let totalOverallBeban = 0;
        let totalRows = 0;

        const groupMap: Record<string, { units: number; totalBeban: number }> = {};

        const parseNumber = (val: any) => {
            if (!val) return 0;
            if (typeof val === "number") return isNaN(val) ? 0 : val;
            const parsed = parseFloat(String(val).replace(/,/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        };

        data.forEach((row: any) => {
            // Check for Beban Dealer or fallback to Diskon Total just in case
            const beban = parseNumber((row["Beban Dealer"] !== undefined && row["Beban Dealer"] !== "") ? row["Beban Dealer"] : row["Diskon Total"]);
            const groupKey = row[groupField] || "Unknown";

            totalOverallBeban += beban;
            totalRows++;

            if (!groupMap[groupKey]) {
                groupMap[groupKey] = { units: 0, totalBeban: 0 };
            }
            groupMap[groupKey].units += 1;
            groupMap[groupKey].totalBeban += beban;
        });

        const overallTeamAvg = totalRows > 0 ? totalOverallBeban / totalRows : 0;

        const tableArray = Object.entries(groupMap).map(([name, stats]) => {
            const avgBeban = stats.units > 0 ? stats.totalBeban / stats.units : 0;
            const vsTeamNum = overallTeamAvg > 0 ? ((avgBeban - overallTeamAvg) / overallTeamAvg) * 100 : 0;
            const vsTeam = `${vsTeamNum > 0 ? '+' : ''}${vsTeamNum.toFixed(1)}%`;

            return {
                name,
                units: stats.units,
                totalBeban: stats.totalBeban,
                avgBeban,
                vsTeam,
                vsTeamNum
            };
        });

        tableArray.sort((a, b) => b.avgBeban - a.avgBeban);

        return { tableData: tableArray, teamAvg: overallTeamAvg };
    }, [data, groupField]);

    const getHeatBadge = (avgBeban: number) => {
        if (avgBeban < 300000) return { label: "✓ Efficient", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
        if (avgBeban <= 500000) return { label: "⚠ Watch", bg: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
        return { label: "🚨 Over-discount", bg: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
    };

    if (!data || data.length === 0) return null;

    return (
        <div className="col-span-12 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Avg Beban Dealer Analysis</h3>
                    <p className="text-sm text-muted-foreground">Identify discount efficiency across groups. Team Avg: <span className="font-semibold text-foreground">Rp {teamAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>/unit</p>
                </div>

                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setGroupField("Nama Salesman")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${groupField === "Nama Salesman" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
                    >
                        <Users className="h-4 w-4" /> By Salesman
                    </button>
                    <button
                        onClick={() => setGroupField("Nama Dealer")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${groupField === "Nama Dealer" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
                    >
                        <Store className="h-4 w-4" /> By Dealer
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm text-left relative">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">#</th>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium text-right">Units</th>
                            <th className="px-6 py-4 font-medium text-right">Total Beban</th>
                            <th className="px-6 py-4 font-medium text-right">Avg/Unit</th>
                            <th className="px-6 py-4 font-medium">Efficiency</th>
                            <th className="px-6 py-4 font-medium text-right">vs Team Avg</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tableData.map((row, i) => {
                            const heat = getHeatBadge(row.avgBeban);
                            return (
                                <tr key={i} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 text-muted-foreground">{i + 1}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{row.name}</td>
                                    <td className="px-6 py-4 text-right">{row.units.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">Rp {row.totalBeban.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-semibold">Rp {row.avgBeban.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${heat.bg}`}>
                                            {heat.label}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium ${row.vsTeamNum > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {row.vsTeam}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
