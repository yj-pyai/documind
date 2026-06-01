"use client";

import Link from "next/link";
import { ArrowRight, Upload, MessageSquare, Search, Zap, Brain } from "lucide-react";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-xl font-bold text-[var(--primary)]">DocuMind</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                进入工作台
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                  登录
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  免费注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm mb-8">
          <Zap className="w-3.5 h-3.5" />
          Powered by RAG + DeepSeek
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          上传文档，
          <span className="text-[var(--primary)]">AI 读懂一切</span>
        </h1>
        <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          DocuMind 是基于 RAG 技术的智能知识库平台。上传你的 PDF、Word 或 Markdown 文档，
          AI 即刻理解全部内容，提供精准的问答、搜索和引用——就像有一位导师读完了你所有的资料。
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href={isLoggedIn ? "/dashboard" : "/register"}
            className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            免费开始使用
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-hover)] transition-colors"
          >
            {isLoggedIn ? "工作台" : "登录"}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Upload className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <h3 className="font-semibold mb-2">多格式文档上传</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              支持 PDF、Word、Markdown、TXT 格式。拖拽上传，自动解析，智能分块，向量化存储。
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <h3 className="font-semibold mb-2">RAG 智能问答</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              基于文档内容的精准问答，每个回答都标注引用来源。流式输出，秒级响应，支持多轮对话追问。
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Search className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <h3 className="font-semibold mb-2">语义搜索</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              不仅仅是关键词匹配，AI 理解你的查询意图，在知识库中搜索最相关的内容片段。
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border)] py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">三步开始</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[var(--primary)]">1</span>
              </div>
              <h4 className="font-semibold mb-2">创建知识库</h4>
              <p className="text-sm text-[var(--muted)]">命名你的知识库，按主题组织文档</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[var(--primary)]">2</span>
              </div>
              <h4 className="font-semibold mb-2">上传文档</h4>
              <p className="text-sm text-[var(--muted)]">拖拽 PDF/Word/Markdown 文件到知识库</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[var(--primary)]">3</span>
              </div>
              <h4 className="font-semibold mb-2">开始提问</h4>
              <p className="text-sm text-[var(--muted)]">像和专家对话一样提问，AI 引用文档回答</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[var(--muted)]">
          <p>Built with ❤️ using Next.js · FastAPI · PostgreSQL · DeepSeek</p>
          <p className="mt-1">© 2026 DocuMind. Open source project.</p>
        </div>
      </footer>
    </div>
  );
}
