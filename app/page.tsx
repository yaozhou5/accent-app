import type { Metadata } from "next";
import HomeContent from "@/components/HomeContent";

export const metadata: Metadata = {
  title: "Write it better. Keep it yours.",
  description: "Turn your thoughts into clearer writing without losing your words, meaning or personality.",
};

export default function HomePage() {
  return <HomeContent />;
}
