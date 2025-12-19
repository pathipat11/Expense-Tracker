/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/api";
import { getReportsByCategory, getReportsSummary, getReportsTrend } from "@/lib/reports";

export type InsightItem = {
    title: string;
    detail: string;
    level?: "info" | "good" | "warn";
};

export type InsightsResponse = {
    month: string;
    base_currency: string;
    mode: "ai" | "fallback";
    items: InsightItem[];
};

// helper
function n(x: any) {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
}

function fmt(x: number) {
    return x.toFixed(2);
}

export async function getInsights(month: string): Promise<InsightsResponse> {
    // 1) Try AI endpoint first (if you have it)
    try {
        // ✅ ถ้าคุณมี endpoint แบบนี้อยู่: /api/insights/?month=YYYY-MM
        // หรือ /api/ai/insights/ แล้วแต่คุณ
        const res = await api.get("/api/insights/", { params: { month } });
        const data = res.data;

        // normalize
        return {
            month,
            base_currency: data.base_currency ?? data.currency ?? "THB",
            mode: "ai",
            items: (data.items ?? data.insights ?? []).map((x: any) => ({
                title: x.title ?? "Insight",
                detail: x.detail ?? x.text ?? String(x),
                level: x.level,
            })),
        };
    } catch (e: any) {
        // 2) Fallback: generate from reports
        // (เงื่อนไข fallback จะครอบคลุม: 404, 401, 500, หรือไม่มี key)
    }

    // Fallback sources
    const summary = await getReportsSummary(month);
    const byCat = await getReportsByCategory(month, "expense");
    const trend = await getReportsTrend(month, "daily", "all");

    const currency = summary.base_currency ?? byCat.base_currency ?? trend.base_currency ?? "THB";
    const income = n(summary.income);
    const expense = n(summary.expense);
    const net = n(summary.net);

    const topCats = (byCat.items ?? [])
        .slice()
        .sort((a: any, b: any) => n(b.total) - n(a.total))
        .slice(0, 3);

    // trend spike (simple)
    const items = trend.items ?? [];
    const expenses = items.map((x: any) => n(x.expense));
    const maxExpense = expenses.length ? Math.max(...expenses) : 0;
    const maxIdx = expenses.indexOf(maxExpense);
    const maxDay = maxIdx >= 0 ? items[maxIdx]?.bucket : null;

    const insights: InsightItem[] = [];

    // 1 Net
    insights.push({
        title: "Net balance",
        detail: `Your net for this month is ${fmt(net)} ${currency} (income ${fmt(income)} - expense ${fmt(expense)}).`,
        level: net >= 0 ? "good" : "warn",
    });

    // 2 Spending ratio
    if (income > 0) {
        const ratio = (expense / income) * 100;
        insights.push({
            title: "Spending rate",
            detail: `You spent ${ratio.toFixed(1)}% of your income.`,
            level: ratio > 80 ? "warn" : "info",
        });
    } else {
        insights.push({
            title: "Spending rate",
            detail: `Income is 0 this month, so expense tracking is critical.`,
            level: "warn",
        });
    }

    // 3 Top categories
    if (topCats.length) {
        insights.push({
            title: "Top expense categories",
            detail: `Top categories: ${topCats
                .map((c: any) => `${c.category_name} (${fmt(n(c.total))} ${currency})`)
                .join(", ")}.`,
            level: "info",
        });
    } else {
        insights.push({
            title: "Top expense categories",
            detail: "No category spending data found.",
            level: "info",
        });
    }

    // 4 Spike day
    if (maxExpense > 0 && maxDay) {
        insights.push({
            title: "Highest spending day",
            detail: `Your highest expense day was ${maxDay} with ${fmt(maxExpense)} ${currency}.`,
            level: "info",
        });
    }

    // 5 Simple suggestion
    if (topCats[0] && n(topCats[0].total) > 0) {
        insights.push({
            title: "Suggestion",
            detail: `Consider setting a budget for "${topCats[0].category_name}" to control your biggest spending area.`,
            level: "good",
        });
    }

    return {
        month,
        base_currency: currency,
        mode: "fallback",
        items: insights,
    };
}
