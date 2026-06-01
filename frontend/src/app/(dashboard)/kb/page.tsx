"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KnowledgeBase } from "@/types";
import { kbAPI } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, ArrowRight, Trash2, MessageSquare, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function KBListPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    kbAPI.list()
      .then(res => setKbs(res.data.items))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
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
      toast.error("创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？所有文档将永久丢失。")) return;
    try {
      await kbAPI.delete(id);
      setKbs(prev => prev.filter(k => k.id !== id));
      toast.success("已删除");
    } catch (err) {
      toast.error("删除失败");
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">知识库</h1>
          <p className="text-sm text-[var(--muted)] mt-1">管理你的知识库和文档</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          新建知识库
        </button>
      </div>

      {kbs.length === 0 ? (
        <EmptyState
          icon="📚"
          title="还没有知识库"
          description="创建知识库，上传文档，开始 AI 问答"
          action={{ label: "创建知识库", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid gap-4">
          {kbs.map((kb) => (
            <div
              key={kb.id}
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{kb.icon || "📚"}</span>
                  <div>
                    <h3 className="font-medium">{kb.name}</h3>
                    {kb.description && (
                      <p className="text-xs text-[var(--muted)] mt-0.5">{kb.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {kb.document_count} 文档
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/kb/${kb.id}`}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    管理文档
                  </Link>
                  <Link
                    href={`/kb/${kb.id}/chat`}
                    className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs hover:opacity-90 transition-opacity flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" /> 对话
                  </Link>
                  <button
                    onClick={() => handleDelete(kb.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
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
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm">取消</button>
                <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50">
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
