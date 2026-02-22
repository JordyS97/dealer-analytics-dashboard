import { z } from "zod";
import { parse, isValid } from "date-fns";

// Helper to cleanly parse varying date formats (dd/mm/yyyy or mm/dd/yyyy)
export const parseMixedDate = (dateStr: string | number | Date | undefined | null): Date | null => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    // If Excel gives us a serial number for dates:
    if (typeof dateStr === "number") {
        // Excel epoch starts at Dec 30 1899 (mostly)
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + dateStr * 86400000);
    }

    const str = String(dateStr).trim();

    // Try dd/MM/yyyy
    let parsed = parse(str, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) return parsed;

    // Try MM/dd/yyyy
    parsed = parse(str, "MM/dd/yyyy", new Date());
    if (isValid(parsed)) return parsed;

    // Try standard ISO
    parsed = new Date(str);
    if (isValid(parsed)) return parsed;

    return null;
};

// 1️⃣ File 1: Sales Overview Schema
export const SalesOverviewSchema = z.object({
    "No Mesin": z.string().optional(),
    "No. Rangka": z.string().optional(),
    "Tgl Mohon": z.any().transform(parseMixedDate),
    "Nama": z.string().optional(),
    "Alamat": z.string().optional(),
    "Kel": z.string().optional(),
    "Kec": z.string().optional(),
    "Kode Pos": z.union([z.string(), z.number()]).optional(),
    "KTP No": z.union([z.string(), z.number()]).optional(),
    "DP Aktual": z.coerce.number().optional().default(0),
    "Tenor3": z.coerce.number().optional().default(0),
    "Cicilan": z.coerce.number().optional().default(0),
    "Tipe ATPM": z.string().optional(),
    "Warna": z.string().optional(),
    "Tipe Var Plus": z.string().optional(),
    "Cust No.": z.union([z.string(), z.number()]).optional(),
    "Dealer/SO": z.string().optional(),
    "Area Dealer": z.string().optional(),
    "Transaksi": z.string().optional(),
    "Fincoy": z.string().optional(),
    "Unit": z.string().optional(),
    "Rakitan Unit": z.union([z.string(), z.number()]).optional(),
    "Konsumen": z.string().optional(),
    "Pekerjaan4": z.string().optional(),
    "Gender5": z.string().optional(),
    "Motor Sebelum": z.string().optional(),
    "Tanggal SSU": z.any().transform(parseMixedDate),
    "Grup Dealer": z.string().optional(),
    "SF": z.string().optional(),
    "Position": z.string().optional(),
});

// 2️⃣ File 2: Detail Salespeople Schema
export const DetailSalespeopleSchema = z.object({
    "Kode Dealer": z.union([z.string(), z.number()]).optional(),
    "Nama Dealer": z.string().optional(),
    "No Prospect": z.union([z.string(), z.number()]).optional(),
    "Tanggal Prospect": z.any().transform(parseMixedDate),
    "No SPK": z.string().optional(),
    "Tanggal SPK": z.any().transform(parseMixedDate),
    "Tanggal Billing": z.any().transform(parseMixedDate),
    "No Billing": z.string().optional(),
    "Nama Customer": z.string().optional(),
    "Nama Salesman": z.string().optional(),
    "Status Salesman": z.string().optional(),
    "Jenis Konsumen": z.string().optional(),
    "Metode Pembelian": z.string().optional(),
    "Nama Fincoy/Perusahaan MOP": z.string().optional(),
    "DP": z.coerce.number().optional().default(0),
    "Tenor": z.coerce.number().optional().default(0),
    "Angsuran": z.coerce.number().optional().default(0),
    "Tipe Motor": z.string().optional(),
    "Harga OFR": z.coerce.number().optional().default(0),
    "Diskon Total": z.coerce.number().optional().default(0),
    "Net Sales": z.coerce.number().optional().default(0),
    "Status Delivery": z.string().optional(),
}).passthrough(); // Allowing passthrough for many other fields so they don't block upload

// 3️⃣ File 3: Prospect Acquisition Schema
export const ProspectAcquisitionSchema = z.object({
    "Region": z.string().optional(),
    "Kode Dealer": z.union([z.string(), z.number()]).optional(),
    "Nama Dealer": z.string().optional(),
    "ProspectNumber": z.union([z.string(), z.number()]).optional(),
    "Salesman Name": z.string().optional(),
    "Employee Status": z.string().optional(),
    "RegistrationDate": z.any().transform(parseMixedDate),
    "Gender": z.string().optional(),
    "Occupation": z.string().optional(),
    "Source Prospect": z.string().optional(),
    "First Prospect Status": z.string().optional(),
    "Prospect Status": z.string().optional(),
    "Reason": z.string().optional(),
    "FollowUpDate": z.any().transform(parseMixedDate),
    "FollowUp Status": z.string().optional(),
}).passthrough();

// Type inference
export type SalesOverview = z.infer<typeof SalesOverviewSchema>;
export type DetailSalespeople = z.infer<typeof DetailSalespeopleSchema>;
export type ProspectAcquisition = z.infer<typeof ProspectAcquisitionSchema>;
