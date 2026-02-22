"use client";

import { useData } from "@/lib/context/DataContext";
import { Lightbulb, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { useMemo } from "react";

export default function SmartInsights() {
    const { salesOverview, detailSalespeople, prospectAcquisition } = useData();

    const insights = useMemo(() => {
        const rules = [];

        const sales = salesOverview.data;
        const details = detailSalespeople.data;
        const prospects = prospectAcquisition.data;

        if (sales.length > 0) {
            // Find top dealer
            const dealerMap: Record<string, number> = {};
            sales.forEach(r => {
                const d = r["Dealer/SO"];
                if (d) dealerMap[d] = (dealerMap[d] || 0) + 1;
            });
            const topDealer = Object.entries(dealerMap).sort((a, b) => b[1] - a[1])[0];

            if (topDealer) {
                rules.push({
                    type: "positive",
                    icon: TrendingUp,
                    title: "Top Performing Dealership",
                    desc: `${topDealer[0]} is leading your region with ${topDealer[1]} total volume sales. Consider scaling their local marketing strategies to other branches.`
                });
            }
        }

        if (prospects.length > 0) {
            let converted = 0;
            prospects.forEach(r => {
                const status = (r["Prospect Status"] || "").toUpperCase();
                if (status.includes("DEAL") || status.includes("SPK")) converted++;
            });
            const rate = ((converted / prospects.length) * 100).toFixed(1);

            rules.push({
                type: Number(rate) > 20 ? "positive" : "warning",
                icon: Number(rate) > 20 ? Lightbulb : AlertTriangle,
                title: "Funnel Conversion Rate",
                desc: `Your aggregated prospect conversion rate sits at ${rate}%. ${Number(rate) < 20 ? "This is below the optimal threshold. Review salesman follow-up speeds." : "Healthy funnel momentum detected across branches."}`
            });
        }

        if (details.length > 0) {
            let totalDisc = 0;
            let totalRev = 0;
            details.forEach(r => {
                const disc = parseFloat(r["Diskon Total"]) || 0;
                const rev = (parseFloat(r["Net Sales"]) || 0) + (parseFloat(r["Harga OFR"]) || 0);
                totalDisc += disc;
                totalRev += isNaN(rev) ? 0 : rev;
            });

            if (totalRev > 0) {
                const discRate = (totalDisc / (totalRev || 1)) * 100;
                if (discRate > 10) {
                    rules.push({
                        type: "warning",
                        icon: AlertTriangle,
                        title: "High Discount Burn Rate",
                        desc: `Discount penetration represents ${discRate.toFixed(1)}% of gross revenues. Optimize your pricing bands to protect dealer margins.`
                    });
                }
            }
        }

        // Default insight if none exist
        if (rules.length === 0 && (!salesOverview.loading || !detailSalespeople.loading)) {
            rules.push({
                type: "positive",
                icon: Lightbulb,
                title: "System Ready",
                desc: "Upload data files in the Data Hub to automatically generate smart insights."
            });
        }

        return rules;
    }, [salesOverview.data, detailSalespeople.data, prospectAcquisition.data, salesOverview.loading, detailSalespeople.loading]);

    if (insights.length === 0) return null;

    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-foreground">AI Smart Insights</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className={`rounded-lg p-4 border flex gap-4 transition-colors ${insight.type === 'positive'
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-amber-500/5 border-amber-500/20'
                            }`}
                    >
                        <div className={`mt-1 h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${insight.type === 'positive' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                            }`}>
                            <insight.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground text-sm mb-1">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {insight.desc}
                            </p>
                            <button className="mt-3 flex items-center text-xs font-medium text-primary hover:underline">
                                View Report <ArrowRight className="h-3 w-3 ml-1" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
