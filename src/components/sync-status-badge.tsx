"use client";

import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import type { SyncStatusState } from "@/lib/hooks";

/**
 * "Last synced X min ago" pill rendered at the top of the History
 * page. Green when fresh, red when stale (more than 10 minutes since
 * the last successful sync) or when the last sync failed — in which
 * case the error message is shown beneath the pill so failures don't
 * go silent.
 *
 * The hook feeding `status` re-evaluates staleness once a minute so
 * the label stays accurate on tabs the user leaves open.
 */
export function SyncStatusBadge({ status }: { status: SyncStatusState }) {
  const { lastSuccessAt, lastError, isSyncing, isStale } = status;
  const Icon = isStale ? AlertTriangle : CheckCircle2;
  const colorText = isStale ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300";
  const colorBg = isStale ? "bg-red-100 dark:bg-red-950/40" : "bg-emerald-100 dark:bg-emerald-950/40";

  const label =
    isSyncing && lastSuccessAt == null
      ? "Syncing…"
      : lastSuccessAt == null
        ? "Never synced"
        : `Last synced: ${relativeTime(Date.now() - lastSuccessAt)}`;

  return (
    <div className="space-y-1">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colorBg} ${colorText}`}
      >
        <Icon size={12} />
        <span>{label}</span>
        {isSyncing && <Loader2 size={10} className="animate-spin" />}
      </div>
      {lastError && (
        <p className="text-xs text-red-600 dark:text-red-400">{lastError}</p>
      )}
    </div>
  );
}

/** Simple relative-time formatter matching the Android helper. */
function relativeTime(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
