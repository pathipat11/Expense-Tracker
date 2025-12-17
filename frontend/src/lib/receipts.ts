import { api } from "@/lib/api";

export type ReceiptUploadResponse = {
    id: number;
    file: string;
    file_url: string;
    created_at: string;
};

export async function uploadReceipt(file: File) {
    const form = new FormData();
    form.append("file", file);

    const res = await api.post("/api/receipts/upload/", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    const data = res.data;

    return {
        id: data.id,
        file: data.file,
        file_url: data.file_url ?? data.receipt_url,
        created_at: data.created_at,
    } as ReceiptUploadResponse;
}
