"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [timedOut, setTimedOut] = useState(false);

  // Safety timeout — if auth takes more than 4 seconds, give up and redirect to login
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setTimedOut(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (loading && !timedOut) return;

    if (pathname === "/login" || pathname.startsWith("/auth")) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [user, loading, timedOut, pathname, router]);

  // Always render login and auth pages immediately
  if (pathname === "/login" || pathname.startsWith("/auth")) {
    return children;
  }

  // Still loading within timeout — show spinner
  if (loading && !timedOut) {
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

  // Not logged in — return null while redirect fires
  if (!user) return null;

  return children;
}
