/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import Link from "next/link";
import { listWallets, patchWallet, deleteWallet, Wallet } from "@/lib/wallets";

function fmtMoney(x: string) {
    const n = Number(x);
    if (!Number.isFinite(n)) return x;
    return n.toFixed(2);
}

export default function WalletsPage() {
    const [items, setItems] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string>("");

    const [showInactive, setShowInactive] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    async function load() {
        setLoading(true);
        setErr("");
        try {
            // ถ้า backend รองรับ filter is_active ก็ใช้ได้:
            // const data = await listWallets({ is_active: showInactive ? undefined : true });
            const data = await listWallets();
            setItems(data);
        } catch (e: any) {
            setErr(e?.response?.data?.detail || "Failed to load wallets");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const visible = useMemo(() => {
        if (showInactive) return items;
        return items.filter((w) => w.is_active);
    }, [items, showInactive]);

    async function toggleActive(w: Wallet) {
        setBusyId(w.id);
        try {
            const updated = await patchWallet(w.id, { is_active: !w.is_active });
            setItems((prev) => prev.map((x) => (x.id === w.id ? updated : x)));
        } catch (e: any) {
            alert(e?.response?.data?.detail || "Update failed");
        } finally {
            setBusyId(null);
        }
    }

    async function onDelete(w: Wallet) {
        const ok = confirm(`Delete wallet "${w.name}" ?`);
        if (!ok) return;

        setBusyId(w.id);
        try {
            await deleteWallet(w.id);
            setItems((prev) => prev.filter((x) => x.id !== w.id));
        } catch (e: any) {
            // ส่วนใหญ่จะโดน PROTECT ถ้ามี tx -> แนะนำให้ใช้ deactivate แทน
            alert(e?.response?.data?.detail || "Delete failed (try deactivating instead)");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <ProtectedLayout>
            <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Wallets</h1>
                        <p className="text-sm text-gray-600">Manage wallets • currency • active/inactive</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/wallets/new" className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                            + New
                        </Link>
                        <button onClick={load} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border p-4 flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                        />
                        <span className="text-sm">Show inactive</span>
                    </label>
                    <div className="text-sm text-gray-600">
                        Showing <span className="font-medium">{visible.length}</span> wallets
                    </div>
                </div>

                {err && <div className="rounded-xl border p-3 text-rose-700 bg-rose-50">{err}</div>}

                {loading ? (
                    <div className="rounded-xl border p-6">Loading...</div>
                ) : visible.length === 0 ? (
                    <div className="rounded-xl border p-6">
                        No wallets. <Link href="/wallets/new" className="underline">Create one</Link>.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visible.map((w) => (
                            <div key={w.id} className="rounded-2xl border p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">
                                            {w.name}{" "}
                                            <span className="text-xs text-gray-500">
                                                • {w.type}
                                                {w.currency?.code ? ` • ${w.currency.code}` : ""}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            Opening: {fmtMoney(w.opening_balance)} {w.currency?.code || ""}
                                        </div>
                                        <div className="text-xs mt-1">
                                            {w.is_active ? (
                                                <span className="text-emerald-700">Active</span>
                                            ) : (
                                                <span className="text-gray-500">Inactive</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link
                                            href={`/wallets/${w.id}/edit`}
                                            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                                        >
                                            Edit
                                        </Link>

                                        <button
                                            onClick={() => toggleActive(w)}
                                            disabled={busyId === w.id}
                                            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                                        >
                                            {busyId === w.id ? "..." : w.is_active ? "Deactivate" : "Activate"}
                                        </button>

                                        <button
                                            onClick={() => onDelete(w)}
                                            disabled={busyId === w.id}
                                            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedLayout>
    );
}
