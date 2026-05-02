"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminThemeSwitcher } from "./AdminThemeSwitcher";

/**
 * Responsive shell for the admin console.
 *
 * Layout
 * - md+: sidebar is permanently visible on the left, header bar (hamburger
 *        hidden, theme switcher right-aligned) sits above the page content.
 * - <md: sidebar collapses to an off-canvas drawer toggled by a hamburger
 *        in the header bar. Tapping a nav link or the backdrop closes it.
 *
 * Why a header bar instead of an absolute-positioned switcher: the previous
 * `absolute top-4 right-6` switcher overlapped page headings on narrower
 * viewports. Putting it in a flex header that's part of the document flow
 * means content always starts below it — no overlap regardless of width.
 */
export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close the mobile drawer whenever the route changes — otherwise
  // tapping a nav link would navigate but leave the drawer open over the
  // newly-loaded page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open on mobile so the page
  // beneath doesn't scroll under the user's finger.
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar — always rendered at md+ */}
      <div className="hidden md:flex">
        <AdminSidebar email={email} />
      </div>

      {/* Mobile drawer — backdrop + sliding sidebar, only mounted when open */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 flex">
            <AdminSidebar email={email} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top header bar — hamburger (mobile) + theme switcher (always) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-14 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="md:hidden -ml-1 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu size={20} />
          </button>
          {/* Spacer so the switcher stays right-aligned on desktop too */}
          <div className="hidden md:block" />
          <AdminThemeSwitcher />
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </main>

      {/* Drawer close button — rendered as a sibling so it floats above the
          slide-in sidebar's top-right corner without changing the sidebar's
          own markup. */}
      {drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation"
          className="md:hidden fixed top-3 left-[244px] z-50 p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 shadow"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
