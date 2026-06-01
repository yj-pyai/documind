"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { getToken, getUser, logout as doLogout } from "@/lib/auth";
import { Settings, User as UserIcon, Mail, Calendar, LogOut } from "lucide-react";

export default function SettingsPage() {
  const [user] = useState<User | null>(getUser());
  const router = useRouter();

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-8">个人设置</h1>

      {/* Profile Card */}
      <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-[var(--primary)]">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold">{user.username}</h2>
            <p className="text-sm text-[var(--muted)]">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <UserIcon className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-[var(--muted)]">用户名</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-[var(--muted)]">邮箱</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-[var(--muted)]">注册时间</span>
            <span className="font-medium">{new Date(user.created_at).toLocaleDateString("zh-CN")}</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => doLogout()}
        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm hover:bg-red-500/10 transition-colors w-full"
      >
        <LogOut className="w-4 h-4" />
        退出登录
      </button>
    </div>
  );
}
