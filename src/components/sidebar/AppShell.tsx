"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/sidebar/Header";
import { AiAssistant } from "@/components/common/AiAssistant";
import { SidebarProvider, useSidebar } from "@/components/sidebar/SidebarContext";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex bg-gray-50 dark:bg-zinc-950 min-h-screen">
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <AiAssistant />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ShellInner>{children}</ShellInner>
    </SidebarProvider>
  );
}
