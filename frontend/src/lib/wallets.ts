import { api } from "@/lib/api";

export type Wallet = {
    id: number;
    name: string;
};

export async function listWallets(): Promise<Wallet[]> {
    const res = await api.get("/api/wallets/");
    return res.data as Wallet[];
}
