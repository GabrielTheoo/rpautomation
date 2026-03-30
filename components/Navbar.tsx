"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings, Zap } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-navbar"
      style={{ borderColor: "#3d4c25" }}>
      <div className="w-full px-4 flex items-center justify-between h-13" style={{ height: "52px" }}>
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(167,200,113,0.15)", border: "1px solid rgba(167,200,113,0.3)" }}>
            <Zap className="w-4 h-4" style={{ color: "#BBF261" }} />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight" style={{ color: "#e8f0d9" }}>
              RP<span style={{ color: "#BBF261" }}>Automation</span>
            </span>
            <p className="leading-none mt-0.5" style={{ color: "#8fa870", fontSize: "10px" }}>
              Automação de RP
            </p>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={pathname === "/dashboard"
              ? { background: "rgba(167,200,113,0.2)", color: "#A7C871", border: "1px solid rgba(167,200,113,0.3)" }
              : { color: "#8fa870" }}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <Link
            href="/tier-config"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={pathname === "/tier-config"
              ? { background: "rgba(167,200,113,0.2)", color: "#A7C871", border: "1px solid rgba(167,200,113,0.3)" }
              : { color: "#8fa870" }}
          >
            <Settings className="w-3.5 h-3.5" />
            Config. Tier
          </Link>
        </div>
      </div>
    </nav>
  );
}