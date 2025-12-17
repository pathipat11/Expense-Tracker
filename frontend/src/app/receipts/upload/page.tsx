/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { uploadReceipt, ReceiptUploadResponse } from "@/lib/receipts";

function isImage(file: File) {
    return file.type.startsWith("image/");
}

export default function ReceiptUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [result, setResult] = useState<ReceiptUploadResponse | null>(null);

    const previewUrl = useMemo(() => {
        if (!file) return "";
        return URL.createObjectURL(file);
    }, [file]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const uploadedUrl =
        (result as any)?.file_url ||
        (result as any)?.receipt_url ||
        (result as any)?.image_url ||
        "";

    async function onUpload() {
        if (!file) return;
        setBusy(true);
        setErr("");
        setResult(null);

        try {
            const r = await uploadReceipt(file);
            setResult(r);
        } catch (e: any) {
            const msg =
                e?.response?.data?.detail ||
                e?.response?.data?.error ||
                e?.message ||
                "Upload failed";
            setErr(String(msg));
        } finally {
            setBusy(false);
        }
    }

    function reset() {
        setFile(null);
        setResult(null);
        setErr("");
    }

    return (
        <ProtectedLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold">Receipt Upload</h1>
                    <p className="text-sm text-gray-600">
                        Upload a receipt image. You can link it to a transaction later.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left */}
                    <div className="rounded-2xl border p-4">
                        <div className="font-medium">Select file</div>

                        <div className="mt-3">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] ?? null;
                                    if (!f) return;

                                    if (!isImage(f)) {
                                        setErr("Please select an image file.");
                                        return;
                                    }

                                    setErr("");
                                    setResult(null);
                                    setFile(f);
                                }}
                            />
                        </div>

                        {file && (
                            <div className="mt-3 text-sm text-gray-700">
                                <div>
                                    <span className="text-gray-500">Name:</span> {file.name}
                                </div>
                                <div>
                                    <span className="text-gray-500">Size:</span>{" "}
                                    {(file.size / 1024).toFixed(1)} KB
                                </div>
                                <div>
                                    <span className="text-gray-500">Type:</span> {file.type}
                                </div>
                            </div>
                        )}

                        {err && (
                            <div className="mt-3 rounded-xl border bg-rose-50 p-3 text-sm text-rose-700">
                                {err}
                            </div>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                            <button
                                onClick={onUpload}
                                disabled={!file || busy}
                                className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
                            >
                                {busy ? "Uploading..." : "Upload"}
                            </button>

                            <button
                                onClick={reset}
                                className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                            >
                                Reset
                            </button>
                        </div>

                        {result && (
                            <div className="mt-4 rounded-xl border bg-emerald-50 p-3 text-sm text-emerald-800">
                                Uploaded ✅ (id: {result.id})
                                {uploadedUrl ? (
                                    <div className="mt-1 text-xs text-emerald-800 break-all">
                                        {uploadedUrl}
                                    </div>
                                ) : (
                                    <div className="mt-1 text-xs text-emerald-800">
                                        (No URL returned — check backend response fields)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right */}
                    <div className="rounded-2xl border p-4">
                        <div className="flex items-center justify-between">
                            <div className="font-medium">Preview</div>
                            {uploadedUrl && (
                                <a
                                    href={uploadedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm underline"
                                >
                                    Open uploaded
                                </a>
                            )}
                        </div>

                        <div className="mt-3">
                            {!file ? (
                                <div className="text-sm text-gray-600">
                                    Select an image to preview.
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={previewUrl}
                                        alt="preview"
                                        className="w-full object-contain max-h-130 bg-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* preview of uploaded URL */}
                        {uploadedUrl && (
                            <div className="mt-4">
                                <div className="text-sm font-medium">Uploaded preview</div>
                                <div className="mt-2 overflow-hidden rounded-xl border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={uploadedUrl}
                                        alt="uploaded"
                                        className="w-full object-contain max-h-130 bg-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border p-4">
                    <div className="font-medium">Next step</div>
                    <p className="mt-1 text-sm text-gray-600">
                        หลังอัปโหลดแล้ว เราจะทำหน้า Transactions ให้เลือก “Attach receipt”
                        เพื่อผูก receipt_id กับ transaction ได้
                    </p>
                </div>
            </div>
        </ProtectedLayout>
    );
}
