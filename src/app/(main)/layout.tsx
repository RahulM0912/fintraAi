import { ThemeProvider } from "@/components/ThemeProvider"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { Header } from "@/components/sidebar/Header"
import { AiAssistant } from "@/components/common/AiAssistant"
import ".././globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeProvider>
        <div className="flex bg-gray-50 dark:bg-zinc-950 min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <AiAssistant />
      </ThemeProvider>
    </>
  )
}
