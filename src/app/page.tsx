import { LandingNavbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

function Divider() {
  return (
    <div
      className="max-w-[1100px] mx-auto"
      style={{ borderTop: "1px solid var(--ld-border)" }}
    />
  );
}

export default function HomePage() {
  return (
    <div className="bg-[var(--ld-bg)] text-[var(--ld-text)] min-h-screen transition-colors duration-300">
      <LandingNavbar />
      <Hero />
      <Divider />
      <Features />
      <Divider />
      <HowItWorks />
      <Divider />
      <Pricing />
      <Divider />
      <FAQ />
      <Footer />
    </div>
  );
}
