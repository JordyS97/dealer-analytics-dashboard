"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Loader2, Database } from "lucide-react";
import * as xlsx from "xlsx";
import {
    SalesOverviewSchema,
    DetailSalespeopleSchema,
    ProspectAcquisitionSchema
} from "@/lib/validations/upload";
import { z } from "zod";
import { batchUploadToFirestore } from "@/lib/firebase/uploadHelper";

type FileType = "SALES_OVERVIEW" | "DETAIL_SALESPEOPLE" | "PROSPECT_ACQUISITION" | "UNKNOWN";

export default function UploadPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [detectedType, setDetectedType] = useState<FileType>("UNKNOWN");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0 });
    const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
    const [summary, setSummary] = useState<{ total: number; valid: number; errors: number; validData: any[] } | null>(null);

    const detectFileType = (headers: string[]): FileType => {
        const H = headers.map(h => h.trim().toLowerCase());
        if (H.includes("no mesin") && H.includes("tgl mohon") && H.includes("dp aktual")) return "SALES_OVERVIEW";
        if (H.includes("no prospect") && H.includes("nama salesman") && H.includes("harga ofr")) return "DETAIL_SALESPEOPLE";
        if (H.includes("prospectnumber") && H.includes("source prospect") && H.includes("followupdate")) return "PROSPECT_ACQUISITION";
        return "UNKNOWN";
    };

    const handleFileUpload = async (uploadedFile: File) => {
        setFile(uploadedFile);
        setIsProcessing(true);
        setSummary(null);
        setDetectedType("UNKNOWN");

        try {
            const data = await uploadedFile.arrayBuffer();
            const workbook = xlsx.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const json: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
            if (json.length === 0) throw new Error("File is empty.");

            const headers = Object.keys(json[0]);
            const type = detectFileType(headers);
            setDetectedType(type);

            if (type === "UNKNOWN") {
                throw new Error("Could not detect file type. Ensure headers match the exact specifications.");
            }

            let schema: z.ZodTypeAny;
            if (type === "SALES_OVERVIEW") schema = SalesOverviewSchema;
            else if (type === "DETAIL_SALESPEOPLE") schema = DetailSalespeopleSchema;
            else schema = ProspectAcquisitionSchema;

            let validCount = 0;
            let errorCount = 0;
            const validData: any[] = [];

            json.forEach((row, index) => {
                const result = schema.safeParse(row);
                if (result.success) {
                    validCount++;
                    validData.push(result.data);
                } else {
                    if (errorCount === 0) {
                        console.log(`Row ${index} validation error:`, result.error);
                    }
                    errorCount++;
                }
            });

            setSummary({ total: json.length, valid: validCount, errors: errorCount, validData });

        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : "Failed to parse file");
        } finally {
            setIsProcessing(false);
        }
    };

    const executeDatabaseUpload = async () => {
        if (!summary || summary.validData.length === 0 || detectedType === "UNKNOWN") return;

        setIsUploading(true);
        setUploadProgress({ uploaded: 0, total: summary.validData.length });
        setEtaSeconds(null);

        try {
            // Map file type to Firestore Collection Name
            let collectionName = "unknown";
            if (detectedType === "SALES_OVERVIEW") collectionName = "sales_overview";
            if (detectedType === "DETAIL_SALESPEOPLE") collectionName = "detail_salespeople";
            if (detectedType === "PROSPECT_ACQUISITION") collectionName = "prospect_acquisition";

            const startTime = Date.now();
            await batchUploadToFirestore(
                collectionName,
                summary.validData,
                (uploaded, total) => {
                    setUploadProgress({ uploaded, total });
                    const elapsed = (Date.now() - startTime) / 1000;
                    if (elapsed > 0 && uploaded > 0) {
                        const velocity = uploaded / elapsed;
                        const remaining = total - uploaded;
                        setEtaSeconds(Math.max(0, Math.ceil(remaining / velocity)));
                    }
                }
            );

            setSummary(null);
            setFile(null);
            setDetectedType("UNKNOWN");
            alert(`🎉 Successfully uploaded ${summary.validData.length} records to the ${collectionName} database!`);

        } catch (error: any) {
            console.error("Firebase upload error:", error);

            // Extract the actual Firebase error message to display in the UI
            const errorMessage = error?.message || "Unknown Firebase Error occurred.";
            alert(`Upload Failed: ${errorMessage}\n\nIf you see 'Missing or insufficient permissions', please ensure you have applied the firestore.rules to your Firebase Console.`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pt-8">
            <div>
                <h2 className="text-3xl font-bold text-foreground">Smart Data Upload</h2>
                <p className="text-muted-foreground mt-2">
                    Upload your raw exact CSV or Excel files. The system will auto-detect the file type, validate dates, and securely patch the Firebase datastore.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {[
                    { name: "File 1: Sales Overview", id: "SALES_OVERVIEW" },
                    { name: "File 2: Detail Salespeople", id: "DETAIL_SALESPEOPLE" },
                    { name: "File 3: Prospect Acquisition", id: "PROSPECT_ACQUISITION" }
                ].map((type) => (
                    <div key={type.id} className={`relative rounded-xl bg-card border border-border p-6 flex flex-col items-center justify-center text-center transition-all ${detectedType === type.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 transition-all ${detectedType === type.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">{type.name}</h3>
                        {detectedType === type.id && (
                            <span className="absolute top-4 right-4 text-emerald-500">
                                <CheckCircle2 className="h-5 w-5" />
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length > 0) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className={`mt-8 rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-card
          ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50"}
          ${(isProcessing || isUploading) ? "opacity-50 pointer-events-none" : ""}
        `}
            >
                <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing || isUploading}
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) handleFileUpload(e.target.files[0]);
                    }}
                />

                {isProcessing ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                        <h3 className="text-xl font-medium text-foreground">Analyzing & Parsing Data...</h3>
                    </div>
                ) : (
                    <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6 hover:bg-primary/10 transition-colors">
                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">Drag & drop your file here</h3>
                        <p className="text-muted-foreground mb-6 text-center max-w-md">
                            The smart engine will automatically map headers and standardize dates before verifying against the database constraints.
                        </p>
                        <div className="px-8 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors shadow-lg shadow-primary/20">
                            Browse Files
                        </div>
                    </label>
                )}
            </div>

            {summary && (
                <div className="rounded-xl border border-border bg-card p-6 overflow-hidden relative shadow-sm">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
                    <h3 className="text-lg font-bold text-foreground mb-4 ml-4">Upload Summary</h3>
                    <div className="grid grid-cols-3 gap-4 ml-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Rows Checked</p>
                            <p className="text-2xl font-bold text-foreground">{summary.total}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Valid Rows to Upload</p>
                            <p className="text-2xl font-bold text-emerald-500">{summary.valid}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Format Errors (Skipped)</p>
                            <p className="text-2xl font-bold text-rose-500">{summary.errors}</p>
                        </div>
                    </div>

                    <div className="mt-8 ml-4 flex items-center gap-4">
                        <button
                            onClick={executeDatabaseUpload}
                            disabled={isUploading || summary.valid === 0}
                            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading ({uploadProgress.uploaded} / {uploadProgress.total})...
                                </>
                            ) : (
                                <>
                                    <Database className="h-4 w-4" />
                                    Commit Data to Database
                                </>
                            )}
                        </button>

                        {isUploading && (
                            <div className="flex-1 max-w-sm flex flex-col gap-1">
                                <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
                                    <span>Progress: {Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)}%</span>
                                    <span>{etaSeconds !== null ? `~${etaSeconds}s remaining` : 'Calculating...'}</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
