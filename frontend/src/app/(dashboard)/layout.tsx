"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User } from "@/types";
import { authAPI } from "@/lib/api";
import { getToken, logout as doLogout, getUser } from "@/lib/auth";
import { BookOpen, MessageSquare, Settings, LogOut, Menu, X, Zap, Sun, Moon } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const cached = getUser();
    if (cached) {
      setUser(cached);
    } else {
      authAPI.getMe().then(res => setUser(res.data)).catch(() => router.push("/login"));
    }
  }, [router]);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const handleLogout = () => {
    doLogout();
  };

  const navItems = [
    { href: "/dashboard", label: "工作台", icon: Zap },
    { href: "/kb", label: "知识库", icon: BookOpen },
    { href: "/conversations", label: "对话", icon: MessageSquare },
    { href: "/settings", label: "设置", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="p-6 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-lg font-bold text-[var(--primary)]">DocuMind</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href) && (item.href !== "/kb" || pathname === "/kb" || pathname.startsWith("/kb/"));
            const isKbActive = item.href === "/kb" && (pathname === "/kb" || pathname.startsWith("/kb/"));
            const isActive = item.href === "/dashboard" ? pathname === "/dashboard" :
                            item.href === "/kb" ? isKbActive :
                            pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--border)] space-y-2">
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)] w-full transition-colors"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {dark ? "浅色模式" : "深色模式"}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
          {user && (
            <div className="pt-2 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-[var(--surface)] border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-[var(--primary)]">DocuMind</span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-20">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--surface)] border-r border-[var(--border)] p-4 pt-20">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    pathname.startsWith(item.href)
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
