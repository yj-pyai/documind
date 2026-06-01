"use client";

import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("documind_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("documind_token");
        localStorage.removeItem("documind_user");
        // Only redirect if not already on auth pages
        if (!window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/register")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ===== Auth API =====
export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post("/api/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),

  getMe: () => api.get("/api/auth/me"),
};

// ===== Knowledge Base API =====
export const kbAPI = {
  list: () => api.get("/api/knowledge-bases"),
  get: (id: string) => api.get(`/api/knowledge-bases/${id}`),
  create: (data: { name: string; description?: string; icon?: string }) =>
    api.post("/api/knowledge-bases", data),
  update: (id: string, data: { name?: string; description?: string; icon?: string }) =>
    api.put(`/api/knowledge-bases/${id}`, data),
  delete: (id: string) => api.delete(`/api/knowledge-bases/${id}`),
};

// ===== Document API =====
export const docAPI = {
  list: (kbId: string) => api.get(`/api/knowledge-bases/${kbId}/documents`),
  upload: (kbId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/api/knowledge-bases/${kbId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (kbId: string, docId: string) =>
    api.delete(`/api/knowledge-bases/${kbId}/documents/${docId}`),
  reprocess: (kbId: string, docId: string) =>
    api.post(`/api/knowledge-bases/${kbId}/documents/${docId}/reprocess`),
};

// ===== Conversation API =====
export const convAPI = {
  list: (kbId?: string) =>
    api.get("/api/conversations", { params: kbId ? { kb_id: kbId } : {} }),
  get: (id: string) => api.get(`/api/conversations/${id}`),
  delete: (id: string) => api.delete(`/api/conversations/${id}`),
};

// ===== Search API =====
export const searchAPI = {
  search: (kbId: string, q: string, topK = 10) =>
    api.get(`/api/knowledge-bases/${kbId}/search`, { params: { q, top_k: topK } }),
};

// ===== Health =====
export const healthAPI = {
  check: () => api.get("/api/health"),
};

export default api;
