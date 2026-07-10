"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/sidebar/Header";
import { BottomNav } from "@/components/sidebar/BottomNav";
import { AiAssistant } from "@/components/common/AiAssistant";
import { QuickAddProvider } from "@/components/common/QuickAddProvider";
import { RecurringCatchup } from "@/components/common/RecurringCatchup";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <QuickAddProvider>
      <div className="flex bg-[var(--app-bg)] min-h-screen transition-colors duration-300">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          {/* Bottom padding on mobile reserves space for the fixed bottom nav */}
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {children}
          </main>
        </div>

        <AiAssistant />
        <BottomNav />
        <RecurringCatchup />
      </div>
    </QuickAddProvider>
  );
}
