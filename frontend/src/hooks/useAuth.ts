"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { authAPI } from "@/lib/api";
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from "@/lib/auth";

export function useAuth(requireAuth = false) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      if (requireAuth) {
        window.location.href = "/login";
      }
      return;
    }

    // First try cached user
    const cached = getUser();
    if (cached) {
      setUserState(cached);
      setLoading(false);
      return;
    }

    // Fallback: validate with server
    authAPI.getMe()
      .then((res) => {
        setUserState(res.data);
        setUser(res.data);
      })
      .catch(() => {
        removeToken();
        removeUser();
        if (requireAuth) {
          window.location.href = "/login";
        }
      })
      .finally(() => setLoading(false));
  }, [requireAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { access_token, user } = res.data;
      setToken(access_token);
      setUser(user);
      // Force full page reload to dashboard to ensure clean state
      window.location.href = "/dashboard";
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Login failed";
      setError(msg);
      setLoading(false);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authAPI.register({ email, username, password });
      const { access_token, user } = res.data;
      setToken(access_token);
      setUser(user);
      // Force full page reload to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Registration failed";
      setError(msg);
      setLoading(false);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    removeUser();
    window.location.href = "/login";
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}
