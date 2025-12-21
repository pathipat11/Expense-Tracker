/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // ส่ง cookie refresh ไปด้วย
});

function isRefreshRequest(config: any) {
    const url = String(config?.url || "");
    return url.includes("/api/auth/refresh/");
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
    const res = await axios.post(
        `${API_BASE_URL}/api/auth/refresh/`,
        null,
        { withCredentials: true }
    );
    const access = res.data?.access as string;
    if (!access) throw new Error("Missing access token from refresh");
    return access;
}

api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
        const original: any = error.config;
        if (!original) throw error;

        // ✅ ถ้า refresh เองโดน 401 ห้ามพยายาม refresh ซ้ำ
        if (error.response?.status === 401 && isRefreshRequest(original)) {
            useAuthStore.getState().clear();
            throw error;
        }

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            try {
                if (!refreshing) refreshing = refreshAccessToken().finally(() => (refreshing = null));
                const newAccess = await refreshing;

                const { user } = useAuthStore.getState();
                useAuthStore.getState().setAuth(newAccess, user || ({} as any));

                original.headers = original.headers || {};
                original.headers.Authorization = `Bearer ${newAccess}`;
                return api(original);
            } catch {
                useAuthStore.getState().clear();
                throw error;
            }
        }

        throw error;
    }
);
