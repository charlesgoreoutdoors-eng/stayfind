"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
    if (!loading && user && pathname === "/login") {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#F7F3EF", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif"
      }}>
        <div style={{ textAlign:"center" }}>
          <div style={{
            width:36, height:36, border:"3px solid #DDD5CC", borderTopColor:"#E85D3D",
            borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px"
          }} />
          <p style={{ fontSize:14, color:"#9FB3C8" }}>Loading StayFind...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // On login page, show it without sidebar
  if (pathname === "/login") return children;

  // Not logged in — return null while redirect happens
  if (!user) return null;

  return children;
}
