/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { getInsights, InsightsResponse } from "@/lib/insights";
import { getReportsSummary, ReportsSummary } from "@/lib/reports";

function yyyyMmNow() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

export default function InsightsPage() {
    const [month, setMonth] = useState(yyyyMmNow());
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [data, setData] = useState<InsightsResponse | null>(null);
    const [summary, setSummary] = useState<ReportsSummary | null>(null);

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const [i, s] = await Promise.all([
                getInsights(month),
                getReportsSummary(month).catch(() => null),
            ]);
            setData(i);
            setSummary(s);
        } catch (e: any) {
            setErr(e?.response?.data?.detail || e?.message || "Failed to load insights");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month]);

    const currency = data?.base_currency || summary?.base_currency || "THB";

    return (
        <ProtectedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Insights <span className="text-emerald-600">(AI)</span>
                        </h1>
                        <p className="text-sm text-gray-600">
                            Smart summary for your spending • mode:{" "}
                            <span className="font-medium">
                                {data?.mode ? data.mode : "—"}
                            </span>
                            {" "}• currency: {currency}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600">Month</label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="rounded-xl border px-3 py-2"
                        />
                        <button
                            onClick={load}
                            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {err && (
                    <div className="rounded-2xl border bg-rose-50 p-4 text-sm text-rose-700">
                        {err}
                    </div>
                )}

                {/* Summary mini cards */}
                <section className="grid gap-4 md:grid-cols-3">
                    <Card title="Income" value={summary ? `${summary.income} ${currency}` : "—"} loading={loading} />
                    <Card title="Expense" value={summary ? `${summary.expense} ${currency}` : "—"} loading={loading} />
                    <Card title="Net" value={summary ? `${summary.net} ${currency}` : "—"} loading={loading} />
                </section>

                {/* Insights list */}
                <section className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                        <div className="font-medium">Key insights</div>
                        {data?.mode === "fallback" && (
                            <div className="text-xs text-gray-500">
                                AI key not found → using fallback insights
                            </div>
                        )}
                        {data?.mode === "ai" && (
                            <div className="text-xs text-emerald-700">
                                AI enabled ✅
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-6 text-sm text-gray-600">Loading...</div>
                    ) : !data || data.items.length === 0 ? (
                        <div className="p-6 text-sm text-gray-600">No insights.</div>
                    ) : (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {data.items.map((it, idx) => (
                                <div key={idx} className="rounded-xl border p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium">{it.title}</div>
                                        <Badge level={it.level} />
                                    </div>
                                    <div className="mt-1 text-sm text-gray-700">{it.detail}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </ProtectedLayout>
    );
}

function Card({ title, value, loading }: { title: string; value: string; loading: boolean }) {
    return (
        <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-600">{title}</div>
            <div className="mt-2 text-xl font-semibold">{loading ? "…" : value}</div>
        </div>
    );
}

function Badge({ level }: { level?: "info" | "good" | "warn" }) {
    const text =
        level === "good" ? "Good" : level === "warn" ? "Warn" : "Info";

    const cls =
        level === "good"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : level === "warn"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-gray-50 text-gray-700 border-gray-200";

    return (
        <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>
            {text}
        </span>
    );
}
