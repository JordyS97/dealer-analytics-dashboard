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
    groupFilter: string;
    setGroupFilter: (val: string) => void;
    daerahFilter: string;
    setDaerahFilter: (val: string) => void;
    availableGroups: string[];
    availableDaerahs: string[];
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
    // Raw Datasets
    const [rawSales, setRawSales] = useState<any[]>([]);
    const [rawDetail, setRawDetail] = useState<any[]>([]);
    const [rawProspect, setRawProspect] = useState<any[]>([]);
    const [rawMaster, setRawMaster] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    // Global Filters
    const [dateFilter, setDateFilter] = useState("All Time");
    const [groupFilter, setGroupFilter] = useState("All Groups");
    const [daerahFilter, setDaerahFilter] = useState("All Regions");

    const fetchAllRows = async (tableName: string) => {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase.from(tableName).select("id, data").range(from, from + step - 1);
            if (error) {
                console.error(`Error fetching ${tableName}:`, error);
                break;
            }
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += step;
                if (data.length < step) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }
        return allData;
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Sales Overview
            const salesData = await fetchAllRows("sales_overview");
            const parsedSales = salesData.map(row => ({ id: row.id, ...(row.data as any) }));

            // Fetch Detail Salespeople
            const detailData = await fetchAllRows("detail_salespeople");
            const parsedDetail = detailData.map(row => ({ id: row.id, ...(row.data as any) }));

            // Fetch Prospect Acquisition
            const prospectData = await fetchAllRows("prospect_acquisition");
            const parsedProspect = prospectData.map(row => ({ id: row.id, ...(row.data as any) }));

            // Fetch Master Data
            const masterData = await fetchAllRows("master_dealer");
            const parsedMaster = masterData.map(row => ({ id: row.id, ...(row.data as any) }));

            setRawSales(parsedSales);
            setRawDetail(parsedDetail);
            setRawProspect(parsedProspect);
            setRawMaster(parsedMaster);

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
    const { filteredSales, filteredDetail, filteredProspect, availableGroups, availableDaerahs } = useMemo(() => {
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

        // Create Master Mapping
        const dealerMap: Record<string, { group: string, daerah: string }> = {};
        const groupsSet = new Set<string>();
        const daerahsSet = new Set<string>();

        rawMaster.forEach(row => {
            const group = String(row["Group Dealer"] || "").trim();
            const daerah = String(row["Daerah Dealer"] || "").trim();

            if (group) groupsSet.add(group);
            if (daerah) daerahsSet.add(daerah);

            const mapping = { group, daerah };

            if (row["Dealer"]) dealerMap[String(row["Dealer"]).toUpperCase()] = mapping;
            if (row["Kode"]) dealerMap[String(row["Kode"]).toUpperCase()] = mapping;
            if (row["Customer Code"]) dealerMap[String(row["Customer Code"]).toUpperCase()] = mapping;
            if (row["STAR Code"]) dealerMap[String(row["STAR Code"]).toUpperCase()] = mapping;
        });

        const getMasterData = (row: any) => {
            const name = String(row["Dealer/SO"] || row["Nama Dealer"] || row["Area Dealer"] || "").toUpperCase().trim();
            const kode = String(row["Kode Dealer"] || "").toUpperCase().trim();
            return dealerMap[name] || dealerMap[kode] || { group: "", daerah: "" };
        };

        const masterCheck = (row: any) => {
            const master = getMasterData(row);

            let passGroup = true;
            if (groupFilter !== "All Groups") {
                passGroup = master.group.toLowerCase() === groupFilter.toLowerCase();
            }

            let passDaerah = true;
            if (daerahFilter !== "All Regions") {
                // Notice the raw file prospect sometimes has "Region" which wasn't strictly checked inside master. Make sure we fallback cleanly.
                passDaerah = master.daerah.toLowerCase() === daerahFilter.toLowerCase();

                // Extra fallback: if Prospect sheet holds "Region" natively instead of mapping out
                if (!passDaerah && row["Region"]) {
                    passDaerah = String(row["Region"]).toLowerCase().trim() === daerahFilter.toLowerCase();
                }
            }

            return passGroup && passDaerah;
        };

        const fSales = rawSales.filter(row => {
            return isDateInRange(row["Tanggal SSU"] || row["Tgl Mohon"]) && masterCheck(row);
        });

        const fDetail = rawDetail.filter(row => {
            return isDateInRange(row["Tanggal SPK"] || row["Tanggal Billing"] || row["Tanggal Prospect"]) && masterCheck(row);
        });

        const fProspect = rawProspect.filter(row => {
            return isDateInRange(row["RegistrationDate"] || row["FollowUpDate"]) && masterCheck(row);
        });

        return {
            filteredSales: fSales,
            filteredDetail: fDetail,
            filteredProspect: fProspect,
            availableGroups: Array.from(groupsSet).sort(),
            availableDaerahs: Array.from(daerahsSet).sort()
        };
    }, [rawSales, rawDetail, rawProspect, rawMaster, dateFilter, groupFilter, daerahFilter]);

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
            groupFilter,
            setGroupFilter,
            daerahFilter,
            setDaerahFilter,
            availableGroups,
            availableDaerahs,
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
