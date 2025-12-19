import { api } from "@/lib/api";
import type { Currency } from "@/lib/currencies";

export type WalletType = "cash" | "bank" | "credit" | "ewallet";

export type Wallet = {
    id: number;
    name: string;
    type: WalletType;
    currency?: Currency;      // read
    currency_id?: number;     // write (serializer uses currency_id)
    opening_balance: string;
    tx_count?: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

export type CreateWalletPayload = {
    name: string;
    type: WalletType;
    currency_id: number;
    opening_balance?: string;
    is_active?: boolean;
};

export type PatchWalletPayload = Partial<{
    name: string;
    type: WalletType;
    currency_id: number;        // อาจถูก backend ปฏิเสธ ถ้ามี tx แล้ว
    opening_balance: string;    // อาจถูก backend ปฏิเสธ ถ้ามี tx แล้ว
    is_active: boolean;
}>;

export async function listWallets(params?: { is_active?: boolean }) {
    const res = await api.get("/api/wallets/", { params });

    // รองรับทั้ง paginated และ non-paginated
    const data = res.data;
    return Array.isArray(data) ? data : data.results;
}


export async function getWallet(id: number) {
    const res = await api.get(`/api/wallets/${id}/`);
    return res.data as Wallet;
}

export async function createWallet(payload: CreateWalletPayload) {
    const res = await api.post("/api/wallets/", payload);
    return res.data as Wallet;
}

export async function patchWallet(id: number, payload: PatchWalletPayload) {
    const res = await api.patch(`/api/wallets/${id}/`, payload);
    return res.data as Wallet;
}

export async function deleteWallet(id: number) {
    await api.delete(`/api/wallets/${id}/`);
}
