import { api } from "@/lib/api";

export type Category = {
    id: number;
    name: string;
    type: "expense" | "income";
};

export async function listCategories(type: "expense" | "income"): Promise<Category[]> {
    const res = await api.get("/api/categories/", { params: { type } });
    return res.data as Category[];
}
