import { Bell, Search, Calendar, MapPin, UserCircle } from "lucide-react";

export default function Header() {
    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-sm z-40">
            <div className="flex items-center gap-4 flex-1">
                <h2 className="text-lg font-bold text-foreground hidden md:block">Analytics Workspace</h2>

                {/* Global Filters */}
                <div className="ml-8 hidden lg:flex items-center gap-3">
                    <div className="flex items-center bg-muted/50 rounded-md px-3 py-1.5 border border-border">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <select className="bg-transparent text-sm font-medium text-foreground outline-none border-none cursor-pointer focus:ring-0">
                            <option>Last 30 Days</option>
                            <option>This Month</option>
                            <option>Last Quarter</option>
                            <option>Year to Date</option>
                            <option>All Time</option>
                        </select>
                    </div>

                    <div className="flex items-center bg-muted/50 rounded-md px-3 py-1.5 border border-border">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                        <select className="bg-transparent text-sm font-medium text-foreground outline-none border-none cursor-pointer focus:ring-0">
                            <option>All Branches & Regions</option>
                            <option>Jakarta Pusat</option>
                            <option>Surabaya Raya</option>
                            <option>Bandung & Priangan</option>
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
