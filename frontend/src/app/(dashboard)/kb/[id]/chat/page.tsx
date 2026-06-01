"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KnowledgeBase, ConversationListItem, Citation } from "@/types";
import { kbAPI, convAPI } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ArrowLeft, Send, Plus, MessageSquare, FileText, X, BookOpen,
  StopCircle, ExternalLink, Bot, User,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const kbId = params.id as string;

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch KB info and conversations
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [kbRes, convRes] = await Promise.all([
          kbAPI.get(kbId),
          convAPI.list(kbId),
        ]);
        setKb(kbRes.data);
        setConversations(convRes.data.items);
      } catch (err) {
        toast.error("Failed to load data");
      } finally {
        setLoadingConvs(false);
      }
    };
    fetchInit();
  }, [kbId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async (convId: string) => {
    setActiveConvId(convId);
    try {
      const res = await convAPI.get(convId);
      setMessages(
        res.data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
        }))
      );
    } catch (err) {
      toast.error("Failed to load conversation");
    }
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const token = getToken();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/api/knowledge-bases/${kbId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: userMsg.content,
          conversation_id: activeConvId || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              if (currentEvent === "token" || data.text !== undefined) {
                const text = data.text || data.data?.text || "";
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: last.content + text };
                  }
                  return updated;
                });
              } else if (currentEvent === "done" || data.answer !== undefined) {
                const finalAnswer = data.answer || data.data?.answer || "";
                const citations = data.citations || data.data?.citations || [];
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: finalAnswer || last.content,
                      citations,
                      streaming: false,
                    };
                  }
                  return updated;
                });
                // Refresh conversation list to get new conversation
                if (!activeConvId) {
                  const convRes = await convAPI.list(kbId);
                  setConversations(convRes.data.items);
                  if (convRes.data.items.length > 0) {
                    setActiveConvId(convRes.data.items[0].id);
                  }
                }
              } else if (currentEvent === "error" || data.message !== undefined) {
                toast.error(data.message || "Error occurred");
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = { ...last, streaming: false };
                  }
                  return updated;
                });
              }
              currentEvent = "";
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(err.message || "Chat failed");
      }
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, kbId, activeConvId]);

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === "assistant") {
        updated[updated.length - 1] = { ...last, streaming: false };
      }
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loadingConvs) return <LoadingSpinner size="lg" />;

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Conversation Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col hidden md:flex">
        <div className="p-4 border-b border-[var(--border)]">
          <Link href={`/kb/${kbId}`} className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            返回知识库
          </Link>
          <button
            onClick={newConversation}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-[var(--muted)] text-center py-8">暂无历史对话</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                  activeConvId === conv.id
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-sm truncate">{conv.title || "New Chat"}</span>
                </div>
                {conv.last_message && (
                  <p className="text-xs text-[var(--muted)] mt-1 truncate">{conv.last_message}</p>
                )}
              </button>
            ))
          )}
        </div>
        {kb && (
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span>{kb.icon || "📚"}</span>
              <span className="text-sm font-medium truncate">{kb.name}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-[var(--border)]">
          <Link href={`/kb/${kbId}`} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h2 className="text-sm font-medium truncate">{kb?.name || "Chat"}</h2>
          </div>
          <button onClick={newConversation} className="p-1">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState
              icon="💬"
              title="开始对话"
              description={kb?.document_count === 0
                ? "知识库中还没有文档，请先上传文档"
                : "向 AI 提问，基于你的文档内容获取精准回答"
              }
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {/* Avatar */}
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                  )}

                  <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
                    {/* Content */}
                    <div
                      className={`p-4 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-[var(--primary)] text-white rounded-tr-md"
                          : "bg-[var(--surface)] border border-[var(--border)] rounded-tl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap markdown-body ${
                          msg.streaming ? "streaming-cursor" : ""
                        }`}>
                          {msg.content || (msg.streaming ? "" : "No response")}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.citations.map((cit, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                            <BookOpen className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>
                              <span className="font-medium text-[var(--primary)]">[{i + 1}]</span>{" "}
                              {cit.doc_name} — {cit.content_snippet.substring(0, 100)}...
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border)] p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={kb?.document_count === 0 ? "请先上传文档..." : "输入你的问题... (Enter 发送，Shift+Enter 换行)"}
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors"
                rows={2}
                disabled={kb?.document_count === 0}
              />
              <div className="flex flex-col gap-1">
                {streaming ? (
                  <button
                    onClick={stopStreaming}
                    className="p-3 rounded-xl bg-red-500 text-white hover:opacity-90 transition-opacity"
                  >
                    <StopCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || streaming || kb?.document_count === 0}
                    className="p-3 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            {kb?.document_count === 0 && (
              <p className="text-xs text-amber-400 mt-2 text-center">
                ⚠️ 知识库中没有文档，请先上传文档才能开始对话
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
