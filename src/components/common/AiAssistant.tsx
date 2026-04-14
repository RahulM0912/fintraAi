"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X, MessageSquare, PlusCircle, PieChart, TrendingUp } from "lucide-react";

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "ai" | "user"; content: string }[]>([
    { role: "ai", content: "Hi! I'm your Fintra AI assistant. How can I help you manage your money today?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "I've noted that down. Is there anything else you'd like to do?" }
      ]);
    }, 1000);
    
    setInput("");
  };

  const chips = [
    { label: "Add expense", icon: <PlusCircle className="mr-2 h-4 w-4" /> },
    { label: "Show monthly spend", icon: <PieChart className="mr-2 h-4 w-4" /> },
    { label: "Where did I spend most?", icon: <TrendingUp className="mr-2 h-4 w-4" /> },
  ];

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Overlay Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:w-[400px] border-l bg-background shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                <span className="text-white text-sm font-bold">✨</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold">AI Assistant</h2>
                <p className="text-xs text-muted-foreground">Always here to help</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "user" ? "U" : "✨"}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions & Input */}
            <div className="border-t bg-background p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {chips.map((chip, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() => setInput(chip.label)}
                  >
                    {chip.icon}
                    {chip.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="I spent 500 on food..."
                  className="rounded-full bg-muted/50 focus-visible:ring-1"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full bg-primary"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
        </div>
      )}
    </>
  );
}
