/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { createTransaction, uploadReceipt } from "@/lib/transactions";
import { listWallets } from "@/lib/wallets";
import { listCategories } from "@/lib/categories";

type Wallet = { id: number; name: string };
type Category = { id: number; name: string };

export default function NewTransactionPage() {
    const router = useRouter();
    const params = useSearchParams();

    // receipt from query
    const receiptUrlFromQuery = params.get("receipt_url") || "";

    const [type, setType] = useState<"expense" | "income">("expense");
    const [occurredAt, setOccurredAt] = useState(() =>
        new Date().toISOString().slice(0, 16)
    );
    const [walletId, setWalletId] = useState<number | null>(null);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [amount, setAmount] = useState("");
    const [merchant, setMerchant] = useState("");
    const [note, setNote] = useState("");

    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptUrl, setReceiptUrl] = useState<string>(receiptUrlFromQuery);

    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    // load wallets + categories
    useEffect(() => {
        listWallets().then(setWallets);
        listCategories(type).then(setCategories);
    }, [type]);

    async function onSubmit() {
        if (!walletId || !amount) {
            setErr("Wallet and amount are required.");
            return;
        }

        setBusy(true);
        setErr("");

        try {
            let finalReceiptUrl = receiptUrl;

            // upload receipt if user picked a new file
            if (!finalReceiptUrl && receiptFile) {
                const r = await uploadReceipt(receiptFile);
                finalReceiptUrl = r.receipt_url;
            }

            await createTransaction({
                type,
                occurred_at: new Date(occurredAt).toISOString(),
                amount,
                wallet_id: walletId,
                category_id: categoryId || undefined,
                merchant,
                note,
                receipt_url: finalReceiptUrl || undefined,
            });

            router.push("/transactions");
        } catch (e: any) {
            setErr(e?.response?.data?.detail || "Create failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <ProtectedLayout>
            <div className="max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Create Transaction</h1>
                    <p className="text-sm text-gray-600">
                        Simple flow: fill → save → done ✅
                    </p>
                </div>

                {err && (
                    <div className="rounded-xl border bg-rose-50 p-3 text-sm text-rose-700">
                        {err}
                    </div>
                )}

                {/* Form */}
                <div className="grid gap-4">
                    <div className="flex gap-2">
                        {(["expense", "income"] as const).map((x) => (
                            <button
                                key={x}
                                onClick={() => setType(x)}
                                className={`rounded-xl border px-4 py-2 capitalize ${type === x
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "hover:bg-gray-50"
                                    }`}
                            >
                                {x}
                            </button>
                        ))}
                    </div>

                    <input
                        type="datetime-local"
                        value={occurredAt}
                        onChange={(e) => setOccurredAt(e.target.value)}
                        className="rounded-xl border px-3 py-2"
                    />

                    <select
                        value={walletId ?? ""}
                        onChange={(e) => setWalletId(Number(e.target.value))}
                        className="rounded-xl border px-3 py-2"
                    >
                        <option value="">Select wallet</option>
                        {wallets.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={categoryId ?? ""}
                        onChange={(e) =>
                            setCategoryId(e.target.value ? Number(e.target.value) : null)
                        }
                        className="rounded-xl border px-3 py-2"
                    >
                        <option value="">No category</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="rounded-xl border px-3 py-2"
                    />

                    <input
                        placeholder="Merchant"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        className="rounded-xl border px-3 py-2"
                    />

                    <textarea
                        placeholder="Note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="rounded-xl border px-3 py-2"
                    />

                    {/* Receipt */}
                    <div className="rounded-xl border p-3 space-y-2">
                        <div className="font-medium">Receipt</div>

                        {receiptUrl ? (
                            <div>
                                <img
                                    src={receiptUrl}
                                    alt="receipt"
                                    className="max-h-64 rounded-lg border"
                                />
                                <button
                                    onClick={() => setReceiptUrl("")}
                                    className="mt-2 text-sm underline"
                                >
                                    Remove receipt
                                </button>
                            </div>
                        ) : (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    setReceiptFile(e.target.files?.[0] ?? null)
                                }
                            />
                        )}
                    </div>

                    <button
                        onClick={onSubmit}
                        disabled={busy}
                        className="rounded-xl border px-6 py-3 font-medium hover:bg-gray-50 disabled:opacity-60"
                    >
                        {busy ? "Saving..." : "Save Transaction"}
                    </button>
                </div>
            </div>
        </ProtectedLayout>
    );
}
