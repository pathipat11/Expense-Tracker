/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { listTransactions, uploadReceipt, patchTransaction, Transaction } from "@/lib/transactions";

function isImage(file: File) {
    return file.type.startsWith("image/");
}

function safeDecode(s: string) {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

export default function TransactionsPage() {
    const [items, setItems] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [attachingId, setAttachingId] = useState<number | null>(null);

    const router = useRouter();
    const sp = useSearchParams();

    // ✅ รับจาก /transactions?receipt_id=xx&receipt_url=...
    const pendingReceipt = useMemo(() => {
        const rid = sp.get("receipt_id");
        const url = sp.get("receipt_url");
        if (!url) return null;
        return {
            receipt_id: rid ? Number(rid) : null,
            receipt_url: safeDecode(url),
        };
    }, [sp]);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const data = await listTransactions();
            setItems(data);
        } catch {
            setErr("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function onUploadReceipt(txId: number, file: File) {
        try {
            if (!isImage(file)) {
                alert("Please select an image file.");
                return;
            }
            const { receipt_url } = await uploadReceipt(file);
            const updated = await patchTransaction(txId, { receipt_url });
            setItems((prev) => prev.map((x) => (x.id === txId ? updated : x)));
        } catch {
            alert("Upload failed");
        }
    }

    async function onAttachPending(txId: number) {
        if (!pendingReceipt?.receipt_url) return;

        setAttachingId(txId);
        try {
            const updated = await patchTransaction(txId, { receipt_url: pendingReceipt.receipt_url });
            setItems((prev) => prev.map((x) => (x.id === txId ? updated : x)));

            // ✅ ล้าง query ออกจาก URL (กัน attach ซ้ำ)
            router.replace("/transactions");
        } catch (e: any) {
            alert(e?.response?.data?.detail || "Attach failed");
        } finally {
            setAttachingId(null);
        }
    }

    function clearPending() {
        router.replace("/transactions");
    }

    return (
        <ProtectedLayout>
            <div className="space-y-4">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Transactions</h1>
                        <p className="text-sm text-gray-600">
                            Upload receipt → patch transaction ✅ {pendingReceipt ? "• Attach mode" : ""}
                        </p>
                    </div>
                    <button onClick={load} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                        Refresh
                    </button>
                </div>

                {/* ✅ Pending receipt bar */}
                {pendingReceipt && (
                    <div className="rounded-2xl border p-4 bg-emerald-50">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="font-medium text-emerald-900">Receipt ready to attach ✅</div>
                                <div className="text-sm text-emerald-800 break-all">
                                    {pendingReceipt.receipt_id ? `receipt_id: ${pendingReceipt.receipt_id} • ` : ""}
                                    {pendingReceipt.receipt_url}
                                </div>
                                <div className="mt-1 text-xs text-emerald-800">
                                    เลือก transaction ด้านล่าง แล้วกด “Attach this”
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={pendingReceipt.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-xl border px-3 py-2 text-sm hover:bg-white"
                                >
                                    Preview
                                </a>
                                <button
                                    onClick={clearPending}
                                    className="rounded-xl border px-3 py-2 text-sm hover:bg-white"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {err && <div className="rounded-xl border p-3 text-red-600">{err}</div>}

                {loading ? (
                    <div className="rounded-xl border p-6">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="rounded-xl border p-6">No transactions yet.</div>
                ) : (
                    <div className="space-y-3">
                        {items.map((tx) => (
                            <TransactionCard
                                key={tx.id}
                                tx={tx}
                                onUploadReceipt={onUploadReceipt}
                                pendingReceiptUrl={pendingReceipt?.receipt_url ?? null}
                                onAttachPending={onAttachPending}
                                attaching={attachingId === tx.id}
                            />
                        ))}
                    </div>
                )}
            </div>
        </ProtectedLayout>
    );
}

function TransactionCard({
    tx,
    onUploadReceipt,
    pendingReceiptUrl,
    onAttachPending,
    attaching,
}: {
    tx: Transaction;
    onUploadReceipt: (txId: number, file: File) => Promise<void>;
    pendingReceiptUrl: string | null;
    onAttachPending: (txId: number) => Promise<void>;
    attaching: boolean;
}) {
    const date = useMemo(() => {
        try {
            return new Date(tx.occurred_at).toLocaleString();
        } catch {
            return tx.occurred_at;
        }
    }, [tx.occurred_at]);

    return (
        <div className="rounded-2xl border p-4 space-y-2">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="font-medium">
                        {tx.type.toUpperCase()} • {tx.merchant || "—"}
                    </div>
                    <div className="text-sm text-gray-600">
                        {date} • Wallet: {tx.wallet?.name || "—"} • Amount: {tx.amount} {tx.currency?.code || ""}
                    </div>
                    {tx.note && <div className="text-sm text-gray-700 mt-1">{tx.note}</div>}
                </div>

                <div className="text-right">
                    <div className="text-sm text-gray-600">Base</div>
                    <div className="font-semibold">{tx.base_amount}</div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* ✅ Attach pending receipt */}
                {pendingReceiptUrl && (
                    <button
                        onClick={() => onAttachPending(tx.id)}
                        disabled={attaching}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                    >
                        {attaching ? "Attaching..." : "Attach this"}
                    </button>
                )}

                {/* upload receipt inline */}
                <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <span className="text-sm">Upload receipt</span>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            onUploadReceipt(tx.id, f);
                            e.currentTarget.value = ""; // reset
                        }}
                    />
                </label>

                {tx.receipt_url ? (
                    <a
                        className="text-sm underline text-blue-600"
                        href={tx.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                    >
                        View receipt
                    </a>
                ) : (
                    <span className="text-sm text-gray-500">No receipt</span>
                )}
            </div>
        </div>
    );
}
