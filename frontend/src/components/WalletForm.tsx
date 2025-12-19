/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import type { Currency } from "@/lib/currencies";
import type { Wallet, WalletType } from "@/lib/wallets";

type Props = {
    currencies: Currency[];
    initial?: Partial<Wallet>;
    submitting?: boolean;
    // บางกรณี edit แล้วไม่ให้แก้ currency/opening_balance
    lockCurrency?: boolean;
    lockOpeningBalance?: boolean;
    onSubmit: (payload: {
        name: string;
        type: WalletType;
        currency_id: number;
        opening_balance: string;
        is_active: boolean;
    }) => Promise<void>;
    onCancel?: () => void;
};

const WALLET_TYPES: Array<{ value: WalletType; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank" },
    { value: "credit", label: "Credit Card" },
    { value: "ewallet", label: "E-Wallet" },
];

export default function WalletForm({
    currencies,
    initial,
    submitting,
    lockCurrency,
    lockOpeningBalance,
    onSubmit,
    onCancel,
}: Props) {
    const [name, setName] = useState(initial?.name ?? "");
    const [type, setType] = useState<WalletType>((initial?.type as WalletType) ?? "cash");

    const initialCurrencyId = useMemo(() => {
        return (
            (initial as any)?.currency_id ??
            initial?.currency?.id ??
            (currencies[0]?.id ?? 0)
        );
    }, [initial, currencies]);

    const [currencyId, setCurrencyId] = useState<number>(initialCurrencyId);
    

    const [openingBalance, setOpeningBalance] = useState<string>(
        (initial?.opening_balance ?? "0").toString()
    );
    const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);

    const [err, setErr] = useState<string>("");

    
    async function handleSubmit() {
        setErr("");

        if (!name.trim()) {
            setErr("Name is required.");
            return;
        }
        if (!currencyId) {
            setErr("Currency is required.");
            return;
        }

        // normalize opening balance
        const ob = Number(openingBalance);
        if (!Number.isFinite(ob)) {
            setErr("Opening balance must be a number.");
            return;
        }

        try {
            await onSubmit({
                name: name.trim(),
                type,
                currency_id: currencyId,
                opening_balance: ob.toFixed(2),
                is_active: isActive,
            });
        } catch (e: any) {
            setErr(e?.response?.data?.detail || "Save failed");
        }
    }
    

    return (
        <div className="space-y-4">
            {err && (
                <div className="rounded-xl border bg-rose-50 p-3 text-sm text-rose-700">
                    {err}
                </div>
            )}

            <div className="grid gap-1">
                <label className="text-xs text-gray-600">Name</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border px-3 py-2"
                    placeholder="e.g. Cash, KBank, Credit Card"
                />
            </div>

            <div className="grid gap-1">
                <label className="text-xs text-gray-600">Type</label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as WalletType)}
                    className="rounded-xl border px-3 py-2"
                >
                    {WALLET_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1">
                <label className="text-xs text-gray-600">Currency</label>
                <select
                    value={String(currencyId)}
                    disabled={!!lockCurrency}
                    onChange={(e) => setCurrencyId(Number(e.target.value))}
                    className="rounded-xl border px-3 py-2 disabled:opacity-60"
                >
                    {currencies.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                            {c.code} {c.name ? `• ${c.name}` : ""}
                        </option>
                    ))}
                </select>
                {lockCurrency && (
                    <div className="text-xs text-gray-500">
                        Currency locked (wallet already used by transactions).
                    </div>
                )}
            </div>

            <div className="grid gap-1">
                <label className="text-xs text-gray-600">Opening Balance</label>
                <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    disabled={!!lockOpeningBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="rounded-xl border px-3 py-2 disabled:opacity-60"
                />
                {lockOpeningBalance && (
                    <div className="text-xs text-gray-500">
                        Opening balance locked (edit via adjustment transaction instead).
                    </div>
                )}
            </div>

            <label className="inline-flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="text-sm">Active</span>
            </label>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleSubmit}
                    disabled={!!submitting}
                    className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
                >
                    {submitting ? "Saving..." : "Save"}
                </button>

                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
