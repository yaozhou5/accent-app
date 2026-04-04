"use client";

interface TabBarProps {
  activeTab: "write" | "shelf";
  onTabChange: (tab: "write" | "shelf") => void;
  labels: { write: string; shelf: string };
}

export function TabBar({ activeTab, onTabChange, labels }: TabBarProps) {
  return (
    <nav className="flex border-b border-sand px-4" role="tablist">
      {(["write", "shelf"] as const).map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2.5 text-sm font-sans font-medium transition-colors relative ${
            activeTab === tab
              ? "text-ink"
              : "text-sand hover:text-ink/60"
          }`}
        >
          {labels[tab]}
          {activeTab === tab && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral" />
          )}
        </button>
      ))}
    </nav>
  );
}
