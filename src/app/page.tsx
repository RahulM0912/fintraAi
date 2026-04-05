"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
      
      {/* Hero Section */}
      <section className="text-center px-6 md:px-0 mt-16">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Fintra AI
        </h1>
        <p className="text-lg md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Smart finance insights, automated analytics,
          and transaction intelligence — powered by AI.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Get Started
            </button>
          </Link>
          <Link href="#features">
            <button className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition">
              Features
            </button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mt-20 w-full px-6 md:px-12">
        <h2 className="text-3xl font-bold text-center mb-10">
          What Fintra AI Can Do
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="AI Transaction Insights"
            desc="Get intelligent breakdowns of expenses and patterns — automatically."
          />
          <FeatureCard
            title="Smart Predictions"
            desc="Forecast spending and cashflow using advanced AI models."
          />
          <FeatureCard
            title="Chat Finance AI"
            desc="Ask questions like a finance assistant — instant answers on demand."
          />
        </div>
      </section>

      <footer className="mt-24 mb-6 text-gray-600 text-sm text-center">
        © {year} Fintra AI. All rights reserved.
      </footer>
    </main>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-700">{desc}</p>
    </div>
  );
}
