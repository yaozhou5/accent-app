"use client";

import { AuthButton } from "./AuthButton";

interface HeaderProps {
  activeTab: "write" | "shelf";
  onTabChange: (tab: "write" | "shelf") => void;
  tabLabels: { write: string; shelf: string };
}

export function Header({ activeTab, onTabChange, tabLabels }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-ink/10">
      <h1 className="font-serif font-bold text-xl tracking-tight">
        accent<span className="text-teal">.</span>
      </h1>
      <div className="flex items-center gap-2 md:gap-5">
        <AuthButton />
        <nav className="flex items-center gap-1" role="tablist">
          {(["write", "shelf"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => onTabChange(tab)}
              className={`px-3.5 py-2 min-h-[44px] rounded-[8px] text-sm font-sans font-medium transition-colors ${
                activeTab === tab
                  ? "bg-ink text-paper"
                  : "text-ink/50 hover:text-ink/70"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
