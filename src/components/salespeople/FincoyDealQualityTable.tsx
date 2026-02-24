import { useMemo } from "react";
import { startOfMonth, subMonths } from "date-fns";

interface FincoyDealQualityTableProps {
    data: any[];
}

export default function FincoyDealQualityTable({ data }: FincoyDealQualityTableProps) {
    const tableData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const today = new Date();
        const currentMonthStart = startOfMonth(today);
        const lastMonthToday = subMonths(today, 1);
        const lastMonthStart = startOfMonth(lastMonthToday);

        const groupMap: Record<string, any> = {};
        let totalMtd = 0;
        let totalLastMtd = 0;

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
            // Only care about Credit deals for Fincoy
            const method = (row["Metode Pembelian"] || "").toLowerCase();
            if (!method.includes("kredit")) return;

            const fincoy = row["Nama Fincoy/Perusahaan MOP"] || row["Fincoy"] || "Unknown";
            if (!groupMap[fincoy]) {
                groupMap[fincoy] = {
                    name: fincoy,
                    mtdCount: 0,
                    lastCount: 0,
                    dpTotal: 0,
                    tenorTotal: 0,
                    angsuranTotal: 0,
                };
            }

            const stat = groupMap[fincoy];
            const dateVal = parseRowDate(row["Tanggal Billing"]);

            const dp = parseNumber(row["DP"]);
            const tenor = parseNumber(row["Tenor"]);
            const angsuran = parseNumber(row["Angsuran"]);

            if (dateVal) {
                if (dateVal >= currentMonthStart && dateVal <= today) {
                    stat.mtdCount++;
                    stat.dpTotal += dp;
                    stat.tenorTotal += tenor;
                    stat.angsuranTotal += angsuran;
                    totalMtd++;
                } else if (dateVal >= lastMonthStart && dateVal <= lastMonthToday) {
                    stat.lastCount++;
                    totalLastMtd++;
                }
            }
        });

        const arr = Object.values(groupMap).map((stat: any) => {
            const mtdShare = totalMtd > 0 ? (stat.mtdCount / totalMtd) * 100 : 0;
            const lastShare = totalLastMtd > 0 ? (stat.lastCount / totalLastMtd) * 100 : 0;
            const shareDelta = mtdShare - lastShare;

            const avgDP = stat.mtdCount > 0 ? stat.dpTotal / stat.mtdCount : 0;
            const avgTenor = stat.mtdCount > 0 ? stat.tenorTotal / stat.mtdCount : 0;
            const avgAngsuran = stat.mtdCount > 0 ? stat.angsuranTotal / stat.mtdCount : 0;

            return {
                ...stat,
                mtdShare,
                lastShare,
                shareDelta,
                avgDP,
                avgTenor,
                avgAngsuran
            };
        });

        arr.sort((a, b) => b.mtdCount - a.mtdCount);
        return arr;
    }, [data]);

    if (!data || data.length === 0 || tableData.length === 0) return null;

    return (
        <div className="w-full mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-4">Fincoy Deal Quality (MTD)</h4>
            <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs text-left relative">
                    <thead className="text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-4 py-3 font-medium">Fincoy</th>
                            <th className="px-4 py-3 font-medium text-right">MTD</th>
                            <th className="px-4 py-3 font-medium text-right">Last MTD</th>
                            <th className="px-4 py-3 font-medium text-right">Share Δ</th>
                            <th className="px-4 py-3 font-medium text-right">Avg DP</th>
                            <th className="px-4 py-3 font-medium text-right">Avg Tenor</th>
                            <th className="px-4 py-3 font-medium text-right">Avg Angsuran</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tableData.map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                                <td className="px-4 py-3 text-right font-semibold">{row.mtdCount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-muted-foreground">{row.lastCount.toLocaleString()}</td>
                                <td className={`px-4 py-3 text-right font-medium ${row.shareDelta > 0 ? 'text-emerald-500' : row.shareDelta < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                    {row.shareDelta > 0 ? '+' : ''}{row.shareDelta.toFixed(1)}pp
                                </td>
                                <td className="px-4 py-3 text-right">Rp {row.avgDP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-4 py-3 text-right">{row.avgTenor.toFixed(1)} bln</td>
                                <td className="px-4 py-3 text-right">Rp {row.avgAngsuran.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
