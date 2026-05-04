import { ThemeProvider } from "@/components/ThemeProvider"
import { AppShell } from "@/components/sidebar/AppShell"
import ".././globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  )
}
