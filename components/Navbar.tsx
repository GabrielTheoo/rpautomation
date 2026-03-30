"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings, Zap } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <div>
            <span className="font-bold text-text-base text-sm tracking-tight">RP<span className="text-accent">Automation</span></span>
            <p className="text-text-muted text-[10px] leading-none -mt-0.5">Automação de RP</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${pathname==="/dashboard"?"bg-primary/20 text-primary border border-primary/30":"text-text-muted hover:text-text-base hover:bg-card-hover"}`}>
            <BarChart3 className="w-3.5 h-3.5" />Dashboard
          </Link>
          <Link href="/tier-config" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${pathname==="/tier-config"?"bg-primary/20 text-primary border border-primary/30":"text-text-muted hover:text-text-base hover:bg-card-hover"}`}>
            <Settings className="w-3.5 h-3.5" />Config. Tier
          </Link>
        </div>
      </div>
    </nav>
  );
}
