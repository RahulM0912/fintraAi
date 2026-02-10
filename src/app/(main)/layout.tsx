import { ThemeProvider } from "@/components/ThemeProvider"
import { Navbar } from "@/components/navbar/Navbar"
import ".././globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeProvider>
        <Navbar />
        {children}
      </ThemeProvider>
    </>
  )
}
