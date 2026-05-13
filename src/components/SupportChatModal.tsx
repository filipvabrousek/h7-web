"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import type { SupportMessage } from "@/lib/types";

const POLL_MS = 5000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mergeMessages(
  prev: SupportMessage[],
  server: SupportMessage[],
): SupportMessage[] {
  const now = Date.now();
  const pending = prev.filter((m) => {
    if (!m.id.startsWith("optimistic-")) return false;
    if (now - new Date(m.created_at).getTime() > 30_000) return false;
    return !server.some(
      (s) =>
        s.is_from_support === m.is_from_support &&
        (s.text ?? "") === (m.text ?? ""),
    );
  });

  const byId = new Map<string, SupportMessage>();
  for (const m of server) byId.set(m.id, m);
  for (const m of pending) byId.set(m.id, m);

  return Array.from(byId.values()).sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}

export function SupportChatModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/support", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setMessages((prev) => mergeMessages(prev, json.messages));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: SupportMessage = {
      id: optimisticId,
      user_id: "",
      username: "",
      text: trimmed,
      media_url: null,
      media_type: null,
      is_from_support: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("[support] send failed", res.status, errBody);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } else {
        // Swap optimistic for the persisted row returned by the server,
        // so the message survives independent of the next poll cycle.
        const json = (await res.json().catch(() => ({}))) as {
          message?: SupportMessage;
        };
        if (json.message) {
          setMessages((prev) => {
            // Drop the optimistic row and any pre-existing server row with the same id
            const filtered = prev.filter(
              (m) => m.id !== optimisticId && m.id !== json.message!.id,
            );
            return [...filtered, json.message!].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
          });
        }
        // Trigger an immediate refetch so the message list converges
        // to the server's authoritative state without a 5s wait.
        fetchMessages();
      }
    } catch (err) {
      console.error("[support] send threw", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl flex flex-col h-[80vh] sm:h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold">Help & Support</h2>
            <p className="text-xs text-gray-500">We typically reply within a few hours</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">👋</p>
              <p className="text-sm text-gray-500">
                How can we help? Send us a message and we&apos;ll get back to you.
              </p>
            </div>
          )}
          {messages.map((m) => {
            const fromSupport = m.is_from_support;
            return (
              <div key={m.id} className={`flex ${fromSupport ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                    fromSupport
                      ? "bg-gray-100 dark:bg-[#242A2A] text-gray-900 dark:text-gray-100 rounded-bl-md"
                      : "bg-[#063A72] text-white rounded-br-md"
                  }`}
                >
                  {fromSupport && (
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Support</div>
                  )}
                  {m.text && <div>{m.text}</div>}
                  <div className={`text-[10px] mt-1 ${fromSupport ? "text-gray-400" : "text-blue-200"}`}>
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder="Type a message..."
            className="flex-1 resize-none bg-gray-50 dark:bg-[#242A2A] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 max-h-32"
          />
          <button
            type="submit"
            disabled={sending || text.trim() === ""}
            className="h-10 w-10 rounded-xl bg-[#063A72] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#0D4F8C] transition shrink-0"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
