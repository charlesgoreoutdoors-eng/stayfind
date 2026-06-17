"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/sequences/templates", label: "Templates" },
  { href: "/sequences/builder",   label: "Sequences" },
  { href: "/sequences/compose",   label: "Compose" },
  { href: "/sequences/tracking",  label: "Email Tracking" },
];

export default function SequencesLayout({ children }) {
  const pathname = usePathname();
  return (
    <div style={{ padding:"28px 20px 80px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px", marginBottom:16 }}>
          Sequences
        </h1>
        <div style={{ display:"flex", gap:4, borderBottom:"2px solid #F0EBE5" }}>
          {TABS.map(tab => {
            const active = pathname === tab.href || (pathname === "/sequences" && tab.href === "/sequences/templates");
            return (
              <Link key={tab.href} href={tab.href} style={{ textDecoration:"none" }}>
                <div style={{
                  padding:"10px 20px",
                  fontSize:14, fontWeight:600,
                  color: active ? "#E85D3D" : "#9FB3C8",
                  borderBottom: active ? "2px solid #E85D3D" : "2px solid transparent",
                  marginBottom:"-2px",
                  cursor:"pointer",
                  transition:"color 0.15s",
                }}>
                  {tab.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
