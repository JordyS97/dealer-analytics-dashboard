"use client";

import { Bell, Search, Calendar, MapPin } from "lucide-react";
import { useData } from "@/lib/context/DataContext";

export default function Header() {
    const {
        dateFilter, setDateFilter,
        groupFilter, setGroupFilter, availableGroups,
        daerahFilter, setDaerahFilter, availableDaerahs
    } = useData();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-sm z-40">
            <div className="flex items-center gap-4 flex-1">
                <h2 className="text-lg font-bold text-foreground hidden md:block">Analytics Workspace</h2>

                {/* Global Filters */}
                <div className="ml-8 hidden lg:flex items-center gap-3">
                    <div className="flex items-center bg-muted/50 rounded-md px-3 py-1.5 border border-border">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-transparent text-sm font-medium text-foreground outline-none border-none cursor-pointer focus:ring-0"
                        >
                            <option value="Last 30 Days">Last 30 Days</option>
                            <option value="This Month">This Month</option>
                            <option value="Last Quarter">Last Quarter</option>
                            <option value="Year to Date">Year to Date</option>
                            <option value="All Time">All Time</option>
                        </select>
                    </div>

                    <div className="flex items-center bg-muted/50 rounded-md px-3 py-1.5 border border-border">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                        <select
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            className="bg-transparent text-sm font-medium text-foreground outline-none border-none cursor-pointer focus:ring-0 max-w-[150px] truncate"
                        >
                            <option value="All Groups">All Groups</option>
                            {availableGroups.map(group => (
                                <option key={group} value={group}>{group}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-muted/50 rounded-md px-3 py-1.5 border border-border">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                        <select
                            value={daerahFilter}
                            onChange={(e) => setDaerahFilter(e.target.value)}
                            className="bg-transparent text-sm font-medium text-foreground outline-none border-none cursor-pointer focus:ring-0 max-w-[150px] truncate"
                        >
                            <option value="All Regions">All Regions</option>
                            {availableDaerahs.map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search reports or metrics..."
                        className="h-9 w-64 rounded-md border border-border bg-muted/50 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    />
                </div>
                <button className="relative rounded-full p-2 hover:bg-muted text-muted-foreground transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card" />
                </button>
            </div>
        </header>
    );
}
