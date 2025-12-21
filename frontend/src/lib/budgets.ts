/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { api } from "@/lib/api";

export type Budget = {
    id: number;
    month: string; // YYYY-MM
    scope: "total" | "category";
    limit_base_amount: string;
    category?: { id: number; name: string; type?: string; parent?: number | null } | null;
    created_at: string;

    // optional fields from backend
    alert_80_sent?: boolean;
    alert_100_sent?: boolean;
};

export type BudgetStatusItem = {
    budget_id: number;
    title: string;
    scope: "total" | "category";
    category_id: number | null;
    limit: string;
    spent: string;
    remaining: string;
    percent_used: string;
    alert_80_sent: boolean;
    alert_100_sent: boolean;
};

export type BudgetStatusResponse = {
    month: string;
    base_currency: string;
    items: BudgetStatusItem[];
};

type Paginated<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
};

function unwrapList<T>(data: any): T[] {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return []; // กัน runtime พัง
}

export async function listBudgets(month: string) {
    const res = await api.get("/api/budgets/", { params: { month } });
    return unwrapList<Budget>(res.data);
}

export async function createBudget(payload: {
    month: string;
    scope: "total" | "category";
    limit_base_amount: string;
    category_id?: number | null;
}) {
    const res = await api.post("/api/budgets/", payload);
    return res.data as Budget;
}

export async function deleteBudget(id: number) {
    await api.delete(`/api/budgets/${id}/`);
}

export async function getBudgetStatus(month: string) {
    const res = await api.get("/api/budgets/status/", { params: { month } });
    return res.data as BudgetStatusResponse;
}
