"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { authAPI } from "@/lib/api";
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from "@/lib/auth";

export function useAuth() {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check auth on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    // Validate token by fetching user
    authAPI.getMe()
      .then((res) => {
        setUserState(res.data);
        setUser(res.data);
      })
      .catch(() => {
        removeToken();
        removeUser();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { access_token, user } = res.data;
      setToken(access_token);
      setUser(user);
      setUserState(user);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Login failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const register = useCallback(async (email: string, username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authAPI.register({ email, username, password });
      const { access_token, user } = res.data;
      setToken(access_token);
      setUser(user);
      setUserState(user);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Registration failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    removeToken();
    removeUser();
    setUserState(null);
    router.push("/login");
  }, [router]);

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
