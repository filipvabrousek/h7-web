"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import type { H7User, SupportMessage } from "@/lib/types";
import { sendSupportReply } from "@/app/admin/support/actions";
import { computeBMI } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

interface Props {
  userId: string;
  username: string;
  profile: H7User | null;
  initialMessages: SupportMessage[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Merge a fresh server snapshot with the current local state.
 *
 * Rules:
 *  - The server is the source of truth — every persisted row appears exactly
 *    once, keyed by its real id.
 *  - Optimistic rows (id starts with "optimistic-") are only kept if the
 *    server hasn't echoed them back yet. We match by (is_from_support, text,
 *    media_url) so the optimistic copy disappears as soon as the real row
 *    arrives, preventing duplicates.
 *  - Anything older than 30 s that still hasn't been echoed is treated as a
 *    failed send and dropped.
 *  - Final order is strictly by created_at ascending so reply order can't
 *    jitter when the clock or the poll races.
 */
function mergeMessages(
  prev: SupportMessage[],
  server: SupportMessage[],
): SupportMessage[] {
  const now = Date.now();
  const pending = prev.filter((m) => {
    if (!m.id.startsWith("optimistic-")) return false;
    const isStale = now - new Date(m.created_at).getTime() > 30_000;
    if (isStale) return false;
    const echoed = server.some(
      (s) =>
        s.is_from_support === m.is_from_support &&
        (s.text ?? "") === (m.text ?? "") &&
        (s.media_url ?? "") === (m.media_url ?? ""),
    );
    return !echoed;
  });

  // Dedupe server rows by id just in case.
  const byId = new Map<string, SupportMessage>();
  for (const m of server) byId.set(m.id, m);
  for (const m of pending) byId.set(m.id, m);

  return Array.from(byId.values()).sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}

export function SupportThreadView({ userId, username, profile, initialMessages }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for new messages — uses the admin API route which goes through the
  // service-role client server-side, so it works regardless of RLS.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/admin/api/support/${userId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { messages: SupportMessage[] };
        if (cancelled) return;
        setMessages((prev) => mergeMessages(prev, json.messages));
      } catch {
        // ignore — network blip
      }
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);

    // Optimistic insert — replaced when polling fetches the persisted row
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: SupportMessage = {
      id: optimisticId,
      user_id: userId,
      username: "Support",
      text: trimmed,
      media_url: null,
      media_type: null,
      is_from_support: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("text", trimmed);
    startTransition(async () => {
      const result = await sendSupportReply(formData);
      if (result?.error) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    });
  }

  const bmi = profile ? computeBMI(profile) : null;

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold">{username}</h2>
          <div className="text-xs text-gray-500 mt-0.5">
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        <form onSubmit={submit} className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder="Write a reply…"
            className="flex-1 resize-none bg-gray-50 dark:bg-[#242A2A] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 max-h-40"
          />
          <button
            type="submit"
            disabled={isPending || text.trim() === ""}
            className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition shrink-0"
            aria-label="Send reply"
          >
            <Send size={16} />
          </button>
        </form>
        {error && <div className="px-5 py-2 text-xs text-red-500">{error}</div>}
      </div>

      {/* Side panel: user profile */}
      <aside className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 h-fit space-y-4">
        <h3 className="text-sm font-semibold">User profile</h3>
        {profile ? (
          <dl className="space-y-2 text-sm">
            <Row label="Username" value={profile.username || "—"} />
            <Row label="Email" value={profile.email || "—"} />
            <Row label="Gender" value={profile.gender ?? "—"} />
            <Row label="Country" value={profile.country ?? "—"} />
            <Row label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : "—"} />
            <Row label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : "—"} />
            <Row label="BMI" value={bmi ? bmi.toFixed(1) : "—"} />
            <Row label="Joined" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"} />
          </dl>
        ) : (
          <p className="text-xs text-gray-500">Profile not found.</p>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-xs font-medium text-right truncate max-w-[150px]">{value}</dd>
    </div>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const fromSupport = message.is_from_support;
  return (
    <div className={`flex ${fromSupport ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
          fromSupport
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-gray-100 dark:bg-[#242A2A] text-gray-900 dark:text-gray-100 rounded-bl-md"
        }`}
      >
        {message.text && <div>{message.text}</div>}
        {message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noreferrer"
            className="block mt-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.media_url}
              alt="attachment"
              className="rounded-lg max-h-60 object-cover"
            />
          </a>
        )}
        <div className={`text-[10px] mt-1 ${fromSupport ? "text-blue-100" : "text-gray-400"}`}>
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
