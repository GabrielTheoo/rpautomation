"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BarChart3, Settings, Zap, ClipboardCheck, History, User, LogOut, ChevronDown } from "lucide-react";

interface NavbarProps {
  onTierClick?: () => void;
}

export default function Navbar({ onTierClick }: NavbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const user = session?.user;
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U";

  const activeStyle = { background: "rgba(167,200,113,0.2)", color: "#A7C871", border: "1px solid rgba(167,200,113,0.3)" };
  const inactiveStyle = { color: "#8fa870" };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-navbar" style={{ borderColor: "#3d4c25" }}>
      <div className="w-full px-3 sm:px-4 flex items-center justify-between" style={{ height: "52px" }}>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(167,200,113,0.15)", border: "1px solid rgba(167,200,113,0.3)" }}>
            <Zap className="w-4 h-4" style={{ color: "#BBF261" }} />
          </div>
          <div className="hidden sm:block">
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all"
            style={pathname === "/dashboard" ? activeStyle : inactiveStyle}
          >
            <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">Dashboard</span>
          </Link>

          <Link
            href="/acuracia"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all"
            style={pathname.startsWith("/acuracia") ? activeStyle : inactiveStyle}
          >
            <ClipboardCheck className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">Acurácia</span>
          </Link>

          <Link
            href="/historico"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all"
            style={pathname.startsWith("/historico") ? activeStyle : inactiveStyle}
          >
            <History className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">Histórico</span>
          </Link>

          {onTierClick ? (
            <button
              onClick={onTierClick}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all"
              style={inactiveStyle}
            >
              <Settings className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Config. Tier</span>
            </button>
          ) : (
            <Link
              href="/tier-config"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all"
              style={pathname === "/tier-config" ? activeStyle : inactiveStyle}
            >
              <Settings className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Config. Tier</span>
            </Link>
          )}
        </div>

        {/* User Avatar Dropdown */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all hover:bg-white/10"
            style={{ color: "#8fa870" }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "rgba(167,200,113,0.25)", color: "#A7C871", border: "1px solid rgba(167,200,113,0.4)" }}>
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <ChevronDown className={`w-3 h-3 transition-transform hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-lg overflow-hidden z-50"
              style={{ background: "#1e2d10", borderColor: "#3d4c25" }}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b" style={{ borderColor: "#3d4c25" }}>
                <p className="text-sm font-semibold truncate" style={{ color: "#e8f0d9" }}>
                  {user?.name ?? "Usuário"}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: "#8fa870" }}>
                  {user?.email ?? ""}
                </p>
              </div>

              {/* Actions */}
              <div className="py-1">
                <Link
                  href="/perfil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm w-full transition-colors hover:bg-white/10"
                  style={{ color: "#8fa870" }}
                >
                  <User className="w-4 h-4 flex-shrink-0" />
                  Perfil
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm w-full transition-colors hover:bg-white/10 text-left"
                  style={{ color: "#8fa870" }}
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
