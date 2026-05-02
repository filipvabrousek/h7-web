/**
 * Global setup for every vitest worker.
 *
 * Installs a Map-backed localStorage shim and enables the H7 extended
 * staircase (H8–H14) before any test imports the level engine. Without
 * this, `levelFromWeeklyMinutes(840)` would clamp to H7 (the default
 * ceiling for new accounts) and every fixture case expecting H8+ would
 * fail. Mirrors the iOS test target's `setUp`, which does the same via
 * `UserDefaults.standard.set(true, forKey: "h7_extended_staircase")`.
 *
 * Why a hand-rolled shim instead of jsdom's built-in: vitest 3.x +
 * jsdom 25 ship a `localStorage` getter that doesn't expose `setItem`
 * in this environment (see https://github.com/vitest-dev/vitest/issues
 * for the ongoing thread). A 12-line Map shim sidesteps the whole
 * compatibility question and is identical in behaviour for our needs.
 */
import { beforeAll } from "vitest";

function installLocalStorageShim() {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: shim, writable: true });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", { value: shim, writable: true });
  }
}

beforeAll(() => {
  installLocalStorageShim();
  localStorage.setItem("h7_extended_staircase", "true");
});
