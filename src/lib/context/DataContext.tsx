"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";

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
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
    const [salesOverview, setSalesOverview] = useState<FetchState<any>>({ data: [], loading: true, error: null });
    const [detailSalespeople, setDetailSalespeople] = useState<FetchState<any>>({ data: [], loading: true, error: null });
    const [prospectAcquisition, setProspectAcquisition] = useState<FetchState<any>>({ data: [], loading: true, error: null });

    const fetchData = async () => {
        try {
            // Set to loading
            setSalesOverview(prev => ({ ...prev, loading: true }));
            setDetailSalespeople(prev => ({ ...prev, loading: true }));
            setProspectAcquisition(prev => ({ ...prev, loading: true }));

            // Fetch Sales Overview
            const { data: salesData, error: salesError } = await supabase
                .from("sales_overview")
                .select("id, data")
                .limit(5000);

            if (salesError) throw salesError;

            setSalesOverview({
                data: salesData?.map(row => ({ id: row.id, ...(row.data as any) })) || [],
                loading: false,
                error: null
            });

            // Fetch Detail Salespeople
            const { data: detailData, error: detailError } = await supabase
                .from("detail_salespeople")
                .select("id, data")
                .limit(5000);

            if (detailError) throw detailError;

            setDetailSalespeople({
                data: detailData?.map(row => ({ id: row.id, ...(row.data as any) })) || [],
                loading: false,
                error: null
            });

            // Fetch Prospect Acquisition
            const { data: prospectData, error: prospectError } = await supabase
                .from("prospect_acquisition")
                .select("id, data")
                .limit(5000);

            if (prospectError) throw prospectError;

            setProspectAcquisition({
                data: prospectData?.map(row => ({ id: row.id, ...(row.data as any) })) || [],
                loading: false,
                error: null
            });

        } catch (err: any) {
            console.error("Error fetching global context data:", err);
            // Depending on the failure point we could individually set these
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <DataContext.Provider value={{
            salesOverview,
            detailSalespeople,
            prospectAcquisition,
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
