"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConversationListItem } from "@/types";
import { convAPI } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import { MessageSquare, Trash2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    convAPI.list()
      .then(res => setConversations(res.data.items))
      .catch(() => toast.error("Failed to load conversations"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个对话吗？")) return;
    try {
      await convAPI.delete(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      toast.success("对话已删除");
    } catch (err) {
      toast.error("删除失败");
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">对话历史</h1>
      <p className="text-sm text-[var(--muted)] mb-8">所有知识库的对话记录</p>

      {conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title="还没有对话"
          description="进入知识库，开始你的第一次 AI 对话"
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/20 transition-colors"
            >
              <Link href={`/kb/${conv.kb_id}/chat`} className="flex items-center gap-3 flex-1 min-w-0">
                <MessageSquare className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title || "New Chat"}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--muted)]">{conv.message_count} 条消息</span>
                    {conv.last_message && (
                      <span className="text-xs text-[var(--muted)] truncate">{conv.last_message}</span>
                    )}
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-xs text-[var(--muted)]">{formatDate(conv.updated_at)}</span>
                <button
                  onClick={() => handleDelete(conv.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
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
