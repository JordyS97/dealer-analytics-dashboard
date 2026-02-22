"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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
            // Warning: Without indexing, orderBy might fail. We limit to 5000 for client-side processing capacity.
            const salesQuery = query(collection(db, "sales_overview"), limit(5000));
            const salesSnapshot = await getDocs(salesQuery);
            setSalesOverview({
                data: salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                loading: false,
                error: null
            });

            // Fetch Detail Salespeople
            const detailQuery = query(collection(db, "detail_salespeople"), limit(5000));
            const detailSnapshot = await getDocs(detailQuery);
            setDetailSalespeople({
                data: detailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                loading: false,
                error: null
            });

            // Fetch Prospect Acquisition
            const prospectQuery = query(collection(db, "prospect_acquisition"), limit(5000));
            const prospectSnapshot = await getDocs(prospectQuery);
            setProspectAcquisition({
                data: prospectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
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
