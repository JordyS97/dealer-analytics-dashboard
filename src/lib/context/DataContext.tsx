"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { isAfter, isWithinInterval, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, startOfQuarter, parseISO } from "date-fns";

// Global types for the fetched data
type FetchState<T> = {
    data: T[];
    loading: boolean;
    error: string | null;
};

interface DataContextType {
    salesOverview: FetchState<any>;
    detailSalespeople: FetchState<any>;
    prospectAcquisition: FetchState<any>;
    rawSalesOverview: any[];
    rawDetailSalespeople: any[];
    rawProspectAcquisition: any[];
    dateFilter: string;
    setDateFilter: (val: string) => void;
    regionFilter: string;
    setRegionFilter: (val: string) => void;
    availableRegions: string[];
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
    // Raw Datasets
    const [rawSales, setRawSales] = useState<any[]>([]);
    const [rawDetail, setRawDetail] = useState<any[]>([]);
    const [rawProspect, setRawProspect] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    // Global Filters
    const [dateFilter, setDateFilter] = useState("All Time");
    const [regionFilter, setRegionFilter] = useState("All Branches & Regions");

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Sales Overview
            const { data: salesData } = await supabase.from("sales_overview").select("id, data").limit(10000);
            const parsedSales = salesData?.map(row => ({ id: row.id, ...(row.data as any) })) || [];

            // Fetch Detail Salespeople
            const { data: detailData } = await supabase.from("detail_salespeople").select("id, data").limit(10000);
            const parsedDetail = detailData?.map(row => ({ id: row.id, ...(row.data as any) })) || [];

            // Fetch Prospect Acquisition
            const { data: prospectData } = await supabase.from("prospect_acquisition").select("id, data").limit(10000);
            const parsedProspect = prospectData?.map(row => ({ id: row.id, ...(row.data as any) })) || [];

            setRawSales(parsedSales);
            setRawDetail(parsedDetail);
            setRawProspect(parsedProspect);

        } catch (err: any) {
            console.error("Error fetching global context data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const { filteredSales, filteredDetail, filteredProspect, availableRegions } = useMemo(() => {
        const today = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = today;

        if (dateFilter === "Last 30 Days") {
            startDate = subDays(today, 30);
        } else if (dateFilter === "This Month") {
            startDate = startOfMonth(today);
            endDate = endOfMonth(today);
        } else if (dateFilter === "Last Quarter") {
            // Approximation for Last Quarter (last 3 months)
            startDate = startOfQuarter(subMonths(today, 3));
            endDate = subDays(startOfQuarter(today), 1);
        } else if (dateFilter === "Year to Date") {
            startDate = startOfYear(today);
        }

        // Helper to check date bounds safely
        const isDateInRange = (dateString: string | null | undefined) => {
            if (!startDate || !endDate) return true; // All Time
            if (!dateString) return true; // Keep rows without dates rather than hiding them

            const d = new Date(dateString);
            if (isNaN(d.getTime())) return true;
            return isWithinInterval(d, { start: startDate, end: endDate });
        };

        const regionCheck = (rowRegion: string | null | undefined) => {
            if (regionFilter === "All Branches & Regions") return true;
            if (!rowRegion) return true; // Detail Sales doesn't usually have region, keep it visible
            return String(rowRegion).trim().toLowerCase() === regionFilter.toLowerCase();
        };

        // Extracting Dynamic Regions from the Database (Sales Overview has 'Area Dealer', Prospects has 'Region')
        const regionsSet = new Set<string>();

        const fSales = rawSales.filter(row => {
            const rowRegion = row["Area Dealer"] || row["Region"];
            if (rowRegion) regionsSet.add(rowRegion);
            return isDateInRange(row["Tanggal SSU"] || row["Tgl Mohon"]) && regionCheck(rowRegion);
        });

        const fDetail = rawDetail.filter(row => {
            // detail_salespeople typically doesn't have an explicit Region, mostly Kode Dealer/Nama Dealer
            // We'll filter only by Date here to prevent wiping out data
            return isDateInRange(row["Tanggal SPK"] || row["Tanggal Billing"] || row["Tanggal Prospect"]);
        });

        const fProspect = rawProspect.filter(row => {
            const rowRegion = row["Region"];
            if (rowRegion) regionsSet.add(rowRegion);
            return isDateInRange(row["RegistrationDate"] || row["FollowUpDate"]) && regionCheck(rowRegion);
        });

        return {
            filteredSales: fSales,
            filteredDetail: fDetail,
            filteredProspect: fProspect,
            availableRegions: Array.from(regionsSet).sort()
        };
    }, [rawSales, rawDetail, rawProspect, dateFilter, regionFilter]);

    return (
        <DataContext.Provider value={{
            salesOverview: { data: filteredSales, loading, error: null },
            detailSalespeople: { data: filteredDetail, loading, error: null },
            prospectAcquisition: { data: filteredProspect, loading, error: null },
            rawSalesOverview: rawSales,
            rawDetailSalespeople: rawDetail,
            rawProspectAcquisition: rawProspect,
            dateFilter,
            setDateFilter,
            regionFilter,
            setRegionFilter,
            availableRegions,
            refreshData: fetchData
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}
