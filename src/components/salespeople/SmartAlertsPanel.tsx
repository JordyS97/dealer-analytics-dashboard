import { useMemo } from "react";
import { AlertCircle, Clock, FileText, TrendingUp, Star } from "lucide-react";
import { startOfMonth, subMonths, differenceInDays } from "date-fns";

interface SmartAlertsPanelProps {
    data: any[];
}

export default function SmartAlertsPanel({ data }: SmartAlertsPanelProps) {
    const alerts = useMemo(() => {
        if (!data || data.length === 0) return [];

        const today = new Date();
        const currentMonthStart = startOfMonth(today);
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthToday = subMonths(today, 1);

        const newAlerts = [];

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

        let teamTotalBeban = 0;
        let teamTotalUnits = 0;

        const salesmenMap: Record<string, { units: number; beban: number; dealer: string }> = {};
        const motorMap: Record<string, { mtd: number; lastMtd: number }> = {};

        let overdueDeliveryCount = 0;
        let bpkbBacklogCount = 0;

        data.forEach(row => {
            const dateBilling = parseRowDate(row["Tanggal Billing"]);
            const dateBstk = parseRowDate(row["Tgl BSTK"] || row["Tanggal BSTK"]);
            const beban = parseNumber((row["Beban Dealer"] !== undefined && row["Beban Dealer"] !== "") ? row["Beban Dealer"] : row["Diskon Total"]);
            const salesman = row["Nama Salesman"] || "Unknown";
            const dealer = row["Nama Dealer"] || "Unknown";
            const motor = row["Tipe Motor"] || "Unknown";

            const statusDelivery = String(row["Status Delivery"] || "").toLowerCase();
            const statusBpkb = String(row["Status BPKB"] || "").toLowerCase();

            teamTotalBeban += beban;
            teamTotalUnits++;

            // Global Maps for MTD
            if (dateBilling && dateBilling >= currentMonthStart && dateBilling <= today) {
                if (!salesmenMap[salesman]) salesmenMap[salesman] = { units: 0, beban: 0, dealer };
                salesmenMap[salesman].units++;
                salesmenMap[salesman].beban += beban;

                if (!motorMap[motor]) motorMap[motor] = { mtd: 0, lastMtd: 0 };
                motorMap[motor].mtd++;
            } else if (dateBilling && dateBilling >= lastMonthStart && dateBilling <= lastMonthToday) {
                if (!motorMap[motor]) motorMap[motor] = { mtd: 0, lastMtd: 0 };
                motorMap[motor].lastMtd++;
            }

            // Alert 2: Delivery Overdue (> 7 days)
            if (dateBilling && !statusDelivery.includes("terkirim")) {
                if (differenceInDays(today, dateBilling) > 7) {
                    overdueDeliveryCount++;
                }
            }

            // Alert 3: BPKB Backlog (> 30 days)
            if (dateBstk && !statusBpkb.includes("sudah jadi")) {
                if (differenceInDays(today, dateBstk) > 30) {
                    bpkbBacklogCount++;
                }
            }
        });

        const teamAvgBeban = teamTotalUnits > 0 ? teamTotalBeban / teamTotalUnits : 0;

        // Process Salesmen
        let bestSalesman: any = null;
        let maxUnits = 0;

        const salesmenArray = Object.entries(salesmenMap).map(([name, stat]) => {
            const avgBeban = stat.units > 0 ? stat.beban / stat.units : 0;
            return { name, dealer: stat.dealer, units: stat.units, beban: stat.beban, avgBeban };
        });

        const dealerOvercounters: Record<string, any[]> = {};

        salesmenArray.forEach((s) => {
            // Alert 1: Over-discount tracking (grouped by dealer)
            if (s.avgBeban > 500000) {
                if (!dealerOvercounters[s.dealer]) dealerOvercounters[s.dealer] = [];
                dealerOvercounters[s.dealer].push(s);
            }

            // Find Star Performer
            if (s.avgBeban < teamAvgBeban && s.units > maxUnits) {
                maxUnits = s.units;
                bestSalesman = s;
            }
        });

        // Add top 3 overdiscounters per dealer
        Object.values(dealerOvercounters).forEach(list => {
            list.sort((a, b) => b.avgBeban - a.avgBeban);
            list.slice(0, 3).forEach(s => {
                const pctAbove = teamAvgBeban > 0 ? ((s.avgBeban - teamAvgBeban) / teamAvgBeban) * 100 : 0;
                newAlerts.push({
                    type: "critical",
                    icon: AlertCircle,
                    text: `[${s.dealer}] ${s.name} · avg Rp ${s.avgBeban.toLocaleString(undefined, { maximumFractionDigits: 0 })}/unit — ${pctAbove.toFixed(1)}% above team avg · ${s.units} units`
                });
            });
        });

        // Add Star Performer Alert
        if (bestSalesman) {
            const pctBelow = teamAvgBeban > 0 ? ((teamAvgBeban - bestSalesman.avgBeban) / teamAvgBeban) * 100 : 0;
            newAlerts.push({
                type: "positive",
                icon: Star,
                text: `${bestSalesman.name} · ${bestSalesman.units} units · Rp ${bestSalesman.avgBeban.toLocaleString(undefined, { maximumFractionDigits: 0 })}/unit — ${pctBelow.toFixed(1)}% di bawah rata-rata`
            });
        }

        // Add Delivery/BPKB Alerts
        if (overdueDeliveryCount > 0) {
            newAlerts.push({
                type: "warning",
                icon: Clock,
                text: `${overdueDeliveryCount} units belum terkirim > 7 hari`
            });
        }
        if (bpkbBacklogCount > 0) {
            newAlerts.push({
                type: "warning",
                icon: FileText,
                text: `${bpkbBacklogCount} unit BPKB belum jadi > 30 hari`
            });
        }

        // Process Motors (Top Growing)
        let bestMotor: string | null = null;
        let maxGrowth = 0;
        Object.entries(motorMap).forEach(([name, stat]) => {
            if (stat.lastMtd > 0 && stat.mtd > 5) { // Needs at least 5 units to be statistically relevant
                const delta = ((stat.mtd - stat.lastMtd) / stat.lastMtd) * 100;
                if (delta > 20 && delta > maxGrowth) {
                    maxGrowth = delta;
                    bestMotor = name;
                }
            }
        });

        if (bestMotor) {
            newAlerts.push({
                type: "info",
                icon: TrendingUp,
                text: `${bestMotor} tumbuh +${maxGrowth.toFixed(1)}% MTD`
            });
        }

        return newAlerts;
    }, [data]);

    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="w-full grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {alerts.map((alert, i) => {
                const Icon = alert.icon;
                let colorClasses = "";
                if (alert.type === "critical") colorClasses = "bg-rose-500/10 border-rose-500/30 text-rose-700";
                if (alert.type === "warning") colorClasses = "bg-amber-500/10 border-amber-500/30 text-amber-700";
                if (alert.type === "positive") colorClasses = "bg-emerald-500/10 border-emerald-500/30 text-emerald-700";
                if (alert.type === "info") colorClasses = "bg-blue-500/10 border-blue-500/30 text-blue-700";

                return (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${colorClasses}`}>
                        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium leading-tight">{alert.text}</p>
                    </div>
                );
            })}
        </div>
    );
}
