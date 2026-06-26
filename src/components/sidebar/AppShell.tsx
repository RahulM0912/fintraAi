"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/sidebar/Header";
import { BottomNav } from "@/components/sidebar/BottomNav";
import { AiAssistant } from "@/components/common/AiAssistant";
import { QuickAddProvider } from "@/components/common/QuickAddProvider";
import { RecurringCatchup } from "@/components/common/RecurringCatchup";
import { SidebarProvider, useSidebar } from "@/components/sidebar/SidebarContext";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex bg-[var(--app-bg)] min-h-screen transition-colors duration-300">
      {/* Mobile/tablet overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        {/* Bottom padding on mobile reserves space for the fixed bottom nav */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      <AiAssistant />
      <BottomNav />
      <RecurringCatchup />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <QuickAddProvider>
        <ShellInner>{children}</ShellInner>
      </QuickAddProvider>
    </SidebarProvider>
  );
}
