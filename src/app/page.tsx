import { LandingNavbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

function Divider() {
  return (
    <div className="mx-auto max-w-[1100px] border-t border-[var(--hairline)]" />
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)] transition-colors duration-300">
      <LandingNavbar />
      <Hero />
      <Divider />
      <HowItWorks />
      <Divider />
      <Features />
      <Divider />
      <FAQ />
      <Divider />
      <CTA />
      <Footer />
    </div>
  );
}
