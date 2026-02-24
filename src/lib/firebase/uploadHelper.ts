import { db } from "@/lib/firebase/config";
import { collection, writeBatch, doc } from "firebase/firestore";

// Firestore imposes a hard limit of 500 writes, but we use 400 to be extremely safe against off-by-one errors.
const MAX_BATCH_SIZE = 400;

/**
 * Uploads an array of objects to a specific Firestore collection in chunks of 400.
 * 
 * @param collectionName The name of the Firestore collection
 * @param data Array of validated objects to upload
 * @param progressCallback Optional callback to track progress
 */
export async function batchUploadToFirestore(
    collectionName: string,
    data: any[],
    progressCallback?: (uploaded: number, total: number) => void
) {
    if (!data || data.length === 0) return;

    const total = data.length;
    let uploaded = 0;

    // chunk the data array
    for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
        const chunk = data.slice(i, i + MAX_BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
            const docRef = doc(collection(db, collectionName));
            const cleanItem: Record<string, any> = {};
            for (const [key, value] of Object.entries(item)) {
                if (value === undefined) continue;
                if (typeof value === "number" && isNaN(value)) {
                    cleanItem[key] = 0;
                    continue;
                }
                if (value instanceof Date && isNaN(value.getTime())) continue;
                cleanItem[key] = value;
            }
            batch.set(docRef, cleanItem);
        });

        console.log(`Sending batch ${i} to ${i + chunk.length}...`);
        try {
            // Firebase SDK hangs infinitely instead of throwing an error if the connection drops or is blocked.
            // We use Promise.race to enforce a 60 second timeout per batch to allow for slow connections.
            await Promise.race([
                batch.commit(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase network connection timed out after 60 seconds. Please check your internet connection.")), 60000))
            ]);
        } catch (error: any) {
            console.error(`Batch commit failed at row ${i}:`, error);
            throw new Error(`Upload aborted at row ${i} due to network/firebase error: ${error.message}`);
        }

        uploaded += chunk.length;

        if (progressCallback) {
            progressCallback(uploaded, total);
        }
    }

    return { success: true, uploaded };
}
