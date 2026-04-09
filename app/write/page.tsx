"use client";

import dynamic from "next/dynamic";
import { AppNav } from "@/components/AppNav";

const AppShell = dynamic(
  () => import("@/components/AppShell").then((m) => m.AppShell),
  { ssr: false }
);

export default function WritePage() {
  return (
    <div className="min-h-screen bg-[#FDFAF3]">
      <AppNav />
      <AppShell />
    </div>
  );
}
