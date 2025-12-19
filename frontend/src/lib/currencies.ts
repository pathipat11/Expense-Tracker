import { api } from "@/lib/api";

export type Currency = {
    id: number;
    code: string;
    name: string;
    symbol?: string;
};

export async function listCurrencies(): Promise<Currency[]> {
    const res = await api.get("/api/currencies/");
    const data = res.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;

    return [];
}
