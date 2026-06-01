"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KnowledgeBase, Document } from "@/types";
import { kbAPI, docAPI } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatFileSize, getStatusColor, getStatusLabel } from "@/lib/utils";
import { ArrowLeft, Upload, FileText, Trash2, MessageSquare, Search, RefreshCw, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function KBDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kbId = params.id as string;

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kbRes, docRes] = await Promise.all([
        kbAPI.get(kbId),
        docAPI.list(kbId),
      ]);
      setKb(kbRes.data);
      setDocuments(docRes.data.items);
    } catch (err) {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [kbId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await docAPI.upload(kbId, file);
      toast.success("文档已上传，正在处理...");
      // Refetch after a short delay for processing
      setTimeout(fetchData, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("确定要删除这份文档吗？")) return;
    try {
      await docAPI.delete(kbId, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success("文档已删除");
    } catch (err) {
      toast.error("删除失败");
    }
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const { searchAPI } = await import("@/lib/api");
      const res = await searchAPI.search(kbId, searchQ);
      setSearchResults(res.data.results);
    } catch (err) {
      toast.error("搜索失败");
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!kb) return <div className="p-8 text-center text-[var(--muted)]">Knowledge base not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{kb.icon || "📚"}</span>
            <div>
              <h1 className="text-2xl font-bold">{kb.name}</h1>
              {kb.description && <p className="text-sm text-[var(--muted)]">{kb.description}</p>}
            </div>
          </div>
        </div>
        <Link
          href={`/kb/${kbId}/chat`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <MessageSquare className="w-4 h-4" />
          开始对话
        </Link>
      </div>

      {/* Upload */}
      <div className="mb-8">
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--primary)]/50 hover:bg-[var(--surface)] transition-colors"
        >
          <Upload className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
          <p className="text-sm font-medium">
            {uploading ? "上传中..." : "点击或拖拽上传文档"}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">支持 PDF、Word (.docx)、Markdown (.md)、TXT</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.md,.markdown,.txt"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="语义搜索知识库内容..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQ.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--primary)]">{r.doc_name}</span>
                  <span className="text-xs text-[var(--muted)]">相关度: {r.score.toFixed(2)}</span>
                </div>
                <p className="text-sm text-[var(--foreground)] line-clamp-3">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
        文档列表 ({documents.length})
      </h2>

      {documents.length === 0 ? (
        <EmptyState icon="📄" title="还没有文档" description="上传你的第一份文档开始构建知识库" />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-[var(--muted)]" />
                <div>
                  <p className="text-sm font-medium">{doc.filename}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--muted)]">{formatFileSize(doc.file_size)}</span>
                    <span className="text-xs text-[var(--muted)]">{doc.chunk_count} 个分块</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </span>
                    {doc.status === "error" && doc.error_message && (
                      <span className="text-xs text-red-400">{doc.error_message}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">{formatDate(doc.created_at)}</span>
                {doc.status === "error" && (
                  <button
                    onClick={() => docAPI.reprocess(kbId, doc.id).then(fetchData)}
                    className="p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
                    title="重新处理"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteDoc(doc.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
