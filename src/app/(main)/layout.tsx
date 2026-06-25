import { AppShell } from "@/components/sidebar/AppShell"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>{children}</AppShell>
  )
}
