"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Give a tiny grace period for OAuth session to settle
    const timer = setTimeout(() => {
      if (!user && pathname !== "/login" && !pathname.startsWith("/auth")) {
        router.replace("/login");
      } else if (user && pathname === "/login") {
        router.replace("/");
      }
      setReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, pathname, router]);

  // Always show login page and auth callback without guard
  if (pathname === "/login" || pathname.startsWith("/auth")) {
    return children;
  }

  // Show loading spinner while auth resolves
  if (loading || !ready) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", background:"#F7F3EF",
        fontFamily:"Plus Jakarta Sans, system-ui, sans-serif"
      }}>
        <div style={{ textAlign:"center" }}>
          <div style={{
            width:36, height:36, border:"3px solid #DDD5CC",
            borderTopColor:"#E85D3D", borderRadius:"50%",
            animation:"spin 0.8s linear infinite", margin:"0 auto 16px"
          }} />
          <p style={{ fontSize:14, color:"#9FB3C8" }}>Loading StayFind...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  return children;
}
