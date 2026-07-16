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

  // Public routes render without an auth gate. The root "/" is a special
  // case: logged-out visitors see the waitlist landing (rendered by
  // app/page.js), logged-in visitors see the search app.
  const isPublic = pathname === "/login" || pathname === "/waitlist" || pathname.startsWith("/auth");
  const isRoot = pathname === "/";

  useEffect(() => {
    if (loading && !timedOut) return;

    if (isPublic || isRoot) {
      // Bounce logged-in users off the login screen into the app. This must
      // match where login/page.js and the OAuth callback send people
      // (/dashboard) — sending them to "/" instead raced with those pushes and
      // stranded them on the waitlist, since "/" renders the landing whenever
      // `user` hasn't resolved yet and nothing redirects away from root.
      if (user && pathname === "/login") router.replace("/dashboard");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, timedOut, pathname, router, isPublic, isRoot]);

  // Always render login, waitlist and auth pages immediately
  if (isPublic) {
    return children;
  }

  // Still loading within timeout — show spinner
  if (loading && !timedOut) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", background:"var(--color-ground-page)",
        fontFamily:"var(--font-display)"
      }}>
        <div style={{ textAlign:"center" }}>
          <div style={{
            width:36, height:36, border:"3px solid var(--color-border)",
            borderTopColor:"var(--color-accent-amber)", borderRadius:"50%",
            animation:"spin 0.8s linear infinite", margin:"0 auto 16px"
          }} />
          <p style={{ fontSize:14, color:"var(--color-ink-muted)" }}>Loading Dapples...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Logged-out visitors on the root see the waitlist landing (app/page.js
  // decides). On any other protected route, return null while the redirect
  // to /login fires.
  if (!user && !isRoot) return null;

  return children;
}
