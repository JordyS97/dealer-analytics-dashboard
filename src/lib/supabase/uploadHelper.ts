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

    // Purge the current table directly to prevent stacking duplicates upon re-upload
    console.log(`Clearing existing data from ${tableName}...`);
    try {
        const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .not("id", "is", null); // Matches all UUIDs and wipes the table

        if (deleteError) {
            console.error("Supabase clear error:", deleteError);
            throw new Error(`Failed to clear older records: ${deleteError.message}`);
        }
    } catch (err: any) {
        throw new Error(`Failed to clear older records: ${err.message}`);
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
