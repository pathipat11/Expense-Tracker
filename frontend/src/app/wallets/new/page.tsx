/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { useRouter } from "next/navigation";
import { listCurrencies, Currency } from "@/lib/currencies";
import { createWallet } from "@/lib/wallets";
import WalletForm from "@/components/WalletForm";

export default function NewWalletPage() {
    const router = useRouter();
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        (async () => {
            setLoading(true);
            setErr("");
            try {
                const cs = await listCurrencies();
                setCurrencies(cs);
            } catch (e: any) {
                setErr(e?.response?.data?.detail || "Failed to load currencies");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function onSubmit(payload: any) {
        setSaving(true);
        setErr("");
        try {
            await createWallet({
                name: payload.name,
                type: payload.type,
                currency_id: payload.currency_id,
                opening_balance: payload.opening_balance,
                is_active: payload.is_active,
            });
            router.push("/wallets");
        } catch (e: any) {
            setErr(e?.response?.data?.detail || "Create failed");
            throw e;
        } finally {
            setSaving(false);
        }
    }

    return (
        <ProtectedLayout>
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">New Wallet</h1>
                    <p className="text-sm text-gray-600">Create a wallet for transactions.</p>
                </div>

                {err && <div className="rounded-xl border bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}

                {loading ? (
                    <div className="rounded-xl border p-6">Loading...</div>
                ) : currencies.length === 0 ? (
                    <div className="rounded-xl border p-6">
                        No currencies found. Create currencies first in backend.
                    </div>
                ) : (
                    <div className="rounded-2xl border p-4">
                        <WalletForm
                            currencies={currencies}
                            submitting={saving}
                            onSubmit={onSubmit}
                            onCancel={() => router.push("/wallets")}
                        />
                    </div>
                )}
            </div>
        </ProtectedLayout>
    );
}
