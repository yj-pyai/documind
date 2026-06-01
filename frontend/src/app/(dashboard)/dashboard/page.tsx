"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KnowledgeBase } from "@/types";
import { kbAPI } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, BookOpen, MessageSquare, FileText, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchKBs = async () => {
    try {
      const res = await kbAPI.list();
      setKbs(res.data.items);
    } catch (err) {
      console.error("Failed to fetch KBs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKBs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await kbAPI.create({ name: newName, description: newDesc });
      setKbs(prev => [res.data, ...prev]);
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      router.push(`/kb/${res.data.id}`);
    } catch (err) {
      console.error("Failed to create KB:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个知识库吗？所有文档将被永久删除。")) return;
    try {
      await kbAPI.delete(id);
      setKbs(prev => prev.filter(kb => kb.id !== id));
    } catch (err) {
      console.error("Failed to delete KB:", err);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const totalDocs = kbs.reduce((sum, kb) => sum + kb.document_count, 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">工作台</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {kbs.length} 个知识库 · {totalDocs} 份文档
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          新建知识库
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <BookOpen className="w-5 h-5 text-[var(--primary)] mb-2" />
          <p className="text-2xl font-bold">{kbs.length}</p>
          <p className="text-xs text-[var(--muted)]">知识库</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <FileText className="w-5 h-5 text-[var(--primary)] mb-2" />
          <p className="text-2xl font-bold">{totalDocs}</p>
          <p className="text-xs text-[var(--muted)]">文档</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <MessageSquare className="w-5 h-5 text-[var(--primary)] mb-2" />
          <p className="text-2xl font-bold">-</p>
          <p className="text-xs text-[var(--muted)]">对话</p>
        </div>
      </div>

      {/* KB List */}
      {kbs.length === 0 ? (
        <EmptyState
          icon="📚"
          title="还没有知识库"
          description="创建你的第一个知识库，上传文档开始 AI 问答"
          action={{ label: "创建知识库", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {kbs.map((kb) => (
            <div
              key={kb.id}
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{kb.icon || "📚"}</span>
                  <div>
                    <Link href={`/kb/${kb.id}`} className="font-medium hover:text-[var(--primary)] transition-colors">
                      {kb.name}
                    </Link>
                    {kb.description && (
                      <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{kb.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">{kb.document_count} 份文档</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/kb/${kb.id}/chat`}
                    className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    开始对话 <ArrowRight className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => handleDelete(kb.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create KB Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl">
            <h2 className="text-lg font-bold mb-4">新建知识库</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  placeholder="例如：面试准备资料"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">描述（可选）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
                  rows={3}
                  placeholder="描述这个知识库的内容..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
                >
                  {creating ? "创建中..." : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
