import { db } from "@/lib/firebase/config";
import { collection, writeBatch, doc } from "firebase/firestore";

// Firestore imposes a hard limit of 500 writes per batch
const MAX_BATCH_SIZE = 500;

/**
 * Uploads an array of objects to a specific Firestore collection in chunks of 500.
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

    // Chunk the data array into pieces of 500
    for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
        const chunk = data.slice(i, i + MAX_BATCH_SIZE);

        // Create a new batch
        const batch = writeBatch(db);

        chunk.forEach((item) => {
            // Create an auto-generated document ID reference
            const docRef = doc(collection(db, collectionName));

            // Clean undefined values which Firestore rejects
            const cleanItem = Object.fromEntries(
                Object.entries(item).filter(([_, v]) => v !== undefined)
            );

            batch.set(docRef, cleanItem);
        });

        // Commit the batch to Firestore
        await batch.commit();
        uploaded += chunk.length;

        if (progressCallback) {
            progressCallback(uploaded, total);
        }
    }

    return { success: true, uploaded };
}
