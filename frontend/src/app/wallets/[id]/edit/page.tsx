/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { useRouter, useParams } from "next/navigation";
import { listCurrencies, Currency } from "@/lib/currencies";
import { getWallet, patchWallet, Wallet } from "@/lib/wallets";
import WalletForm from "@/components/WalletForm";

export default function EditWalletPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number((params as any)?.id);

    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [wallet, setWallet] = useState<Wallet | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        (async () => {
            setLoading(true);
            setErr("");
            try {
                const [cs, w] = await Promise.all([listCurrencies(), getWallet(id)]);
                setCurrencies(cs);
                setWallet(w);
            } catch (e: any) {
                setErr(e?.response?.data?.detail || "Failed to load wallet");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    async function onSubmit(payload: any) {
        if (!wallet) return;
        setSaving(true);
        setErr("");

        try {
            const updated = await patchWallet(wallet.id, {
                name: payload.name,
                type: payload.type,
                // ถ้า backend ไม่อนุญาตให้แก้ currency/opening_balance (เมื่อมี tx แล้ว)
                // คุณจะปล่อย lock ไว้ (ด้านล่าง) แล้วไม่ส่ง field ก็ได้
                currency_id: payload.currency_id,
                opening_balance: payload.opening_balance,
                is_active: payload.is_active,
            });

            setWallet(updated);
            router.push("/wallets");
        } catch (e: any) {
            setErr(e?.response?.data?.detail || "Update failed");
            throw e;
        } finally {
            setSaving(false);
        }
    }

    const lockCurrency = (wallet as any)?.tx_count > 0;
    const lockOpeningBalance = (wallet as any)?.tx_count > 0;


    return (
        <ProtectedLayout>
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Wallet</h1>
                    <p className="text-sm text-gray-600">Update wallet settings.</p>
                </div>

                {err && <div className="rounded-xl border bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}

                {loading ? (
                    <div className="rounded-xl border p-6">Loading...</div>
                ) : !wallet ? (
                    <div className="rounded-xl border p-6">Wallet not found.</div>
                ) : (
                    <div className="rounded-2xl border p-4">
                        <WalletForm
                            currencies={currencies}
                            initial={wallet}
                            submitting={saving}
                            lockCurrency={lockCurrency}
                            lockOpeningBalance={lockOpeningBalance}
                            onSubmit={onSubmit}
                            onCancel={() => router.push("/wallets")}
                        />

                        <div className="mt-4 text-xs text-gray-500">
                            * แนะนำ: ถ้าจะปรับยอดเริ่มต้นหลังใช้งานแล้ว ให้ทำ “adjustment transaction” แทนการแก้ opening_balance.
                        </div>
                    </div>
                )}
            </div>
        </ProtectedLayout>
    );
}
