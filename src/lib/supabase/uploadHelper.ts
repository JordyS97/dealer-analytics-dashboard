import { supabase } from "@/lib/supabase/client";

// Supabase (Postgres) can easily handle 10,000+ inserts in a single request, 
// but we keep chunks to 2,500 to prevent Vercel payload/timeout limits.
const MAX_BATCH_SIZE = 2500;

/**
 * Uploads an array of objects to a specific Supabase table in chunks.
 * Instead of rigid columns, we dump the entire Excel row into a single JSONB column `data`.
 * By default, this function will DELETE existing rows in the target table to prevent duplicates.
 * 
 * @param tableName The name of the Supabase PostgreSQL table
 * @param data Array of validated objects to upload
 * @param progressCallback Optional callback to track progress
 */
export async function batchUploadToSupabase(
    tableName: string,
    data: any[],
    progressCallback?: (uploaded: number, total: number) => void
) {
    if (!data || data.length === 0) return;

    // To prevent stacking duplicates upon re-upload, we selectively purge ONLY the months
    // that overlap with the new upload bundle.
    let dateColumn = "";
    if (data[0] && "Tgl Mohon" in data[0]) dateColumn = "Tgl Mohon";
    else if (data[0] && "Tanggal SSU" in data[0]) dateColumn = "Tanggal SSU";
    else if (data[0] && "Tanggal SPK" in data[0]) dateColumn = "Tanggal SPK";
    else if (data[0] && "Tanggal Billing" in data[0]) dateColumn = "Tanggal Billing";
    else if (data[0] && "RegistrationDate" in data[0]) dateColumn = "RegistrationDate";

    if (dateColumn) {
        let minDate = new Date(8640000000000000);
        let maxDate = new Date(-8640000000000000);

        data.forEach(row => {
            const val = row[dateColumn];
            if (!val) return;
            const d = val instanceof Date ? val : new Date(val);
            if (!isNaN(d.getTime())) {
                if (d < minDate) minDate = d;
                if (d > maxDate) maxDate = d;
            }
        });

        if (minDate <= maxDate) {
            // Expand to the exact start and end of the months involved to wipe the full month 
            // and replace it cleanly with the new upload.
            const startBounds = new Date(minDate.getFullYear(), minDate.getMonth(), 1).toISOString();
            const endBounds = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            console.log(`Clearing existing ${tableName} data for months ${startBounds} to ${endBounds}...`);
            try {
                const { error: deleteError } = await supabase
                    .from(tableName)
                    .delete()
                    .gte(`data->>${dateColumn}`, startBounds)
                    .lte(`data->>${dateColumn}`, endBounds);

                if (deleteError) {
                    console.error("Supabase clear error:", deleteError);
                    throw new Error(`Failed to clear older records: ${deleteError.message}`);
                }
            } catch (err: any) {
                throw new Error(`Failed to clear older records: ${err.message}`);
            }
        }
    } else {
        // Fallback: If no date column is found, we don't wipe to avoid destroying the whole database, 
        // but this may cause duplicates if they upload the identical file twice.
        // HOWEVER, if it's the master_dealer table, we DO want to wipe it completely because it's a dimensional master table.
        if (tableName === "master_dealer") {
            console.log(`Clearing ALL existing data from ${tableName} (Master Data Replacement)...`);
            try {
                const { error: deleteError } = await supabase.from(tableName).delete().not("id", "is", null);
                if (deleteError) throw new Error(`Failed to clear master table: ${deleteError.message}`);
            } catch (err: any) {
                throw new Error(`Failed to clear master records: ${err.message}`);
            }
        } else {
            console.warn("No timestamp column found for duplicate prevention. Skipping purge.");
        }
    }

    const total = data.length;
    let uploaded = 0;

    // chunk the data array
    for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
        const chunk = data.slice(i, i + MAX_BATCH_SIZE);

        const uploadPayload = chunk.map((item) => {
            const cleanItem: Record<string, any> = {};
            for (const [key, value] of Object.entries(item)) {
                if (value === undefined) continue;
                if (typeof value === "number" && isNaN(value)) {
                    cleanItem[key] = 0;
                    continue;
                }

                // Supabase JSONB can't map native Date objects natively well on insert,
                // so we ISO stringify them for postgres to parse, or keep as string/number.
                if (value instanceof Date) {
                    if (isNaN(value.getTime())) continue;
                    cleanItem[key] = value.toISOString();
                    continue;
                }

                cleanItem[key] = value;
            }

            // The table schema expects the payload inside a `data` JSONB column
            return { data: cleanItem };
        });

        console.log(`Sending batch ${i} to ${i + chunk.length}...`);

        try {
            // Supabase bulk insert
            const { error } = await supabase
                .from(tableName)
                .insert(uploadPayload);

            if (error) {
                console.error("Supabase insert error:", error);
                throw new Error(error.message);
            }

        } catch (error: any) {
            console.error(`Batch insert failed at row ${i}:`, error);
            throw new Error(`Upload aborted at row ${i} due to network/database error: ${error.message}`);
        }

        uploaded += chunk.length;

        if (progressCallback) {
            progressCallback(uploaded, total);
        }
    }

    return { success: true, uploaded };
}
