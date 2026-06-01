"use client";

import { useState, useCallback, useRef } from "react";
import { Citation, SSEEvent } from "@/types";
import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface UseChatOptions {
  kbId: string;
  onToken?: (token: string) => void;
  onReferences?: (refs: Array<{ chunk_id: string; doc_name: string; content_snippet: string; score: number }>) => void;
  onDone?: (answer: string, citations: Citation[]) => void;
  onError?: (error: string) => void;
}

export function useChat({ kbId, onToken, onReferences, onDone, onError }: UseChatOptions) {
  const [streaming, setStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [references, setReferences] = useState<Array<any>>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (question: string, conversationId?: string) => {
    setStreaming(true);
    setAnswer("");
    setReferences([]);
    setCitations([]);

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
          question,
          conversation_id: conversationId || null,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullAnswer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            continue; // Next line will be data
          }
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              // Check the event type from previous line
              // We'll handle it based on the structure
              if (Array.isArray(data)) {
                // references event
                setReferences(data);
                onReferences?.(data);
              } else if (data.text !== undefined) {
                // token event
                setAnswer(prev => prev + data.text);
                onToken?.(data.text);
              } else if (data.answer !== undefined) {
                // done event
                fullAnswer = data.answer;
                setAnswer(fullAnswer);
                const cits = data.citations || [];
                setCitations(cits);
                onDone?.(fullAnswer, cits);
              } else if (data.message !== undefined) {
                // error event
                onError?.(data.message);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        onError?.(err.message || "Chat request failed");
      }
    } finally {
      setStreaming(false);
    }
  }, [kbId, onToken, onReferences, onDone, onError]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return {
    sendMessage,
    stopStreaming,
    streaming,
    answer,
    references,
    citations,
  };
}
