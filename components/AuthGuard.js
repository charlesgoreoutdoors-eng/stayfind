"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import { isHotel } from "../lib/access";

export default function AuthGuard({ children }) {
  const { user, profile, loading } = useAuth();
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

  // Public routes render without an auth gate. /hotel/signup is the hotel
  // sign-up page and must be reachable while logged out. The root "/" is a
  // special case: logged-out visitors see the waitlist, logged-in see the app.
  const isPublic =
    pathname === "/login" ||
    pathname === "/waitlist" ||
    pathname === "/hotel/signup" ||
    pathname.startsWith("/auth");
  const isRoot = pathname === "/";

  // The hotel site (its own shell), excluding the public sign-up page above.
  const inHotelArea = pathname === "/hotel" || pathname.startsWith("/hotel/");

  // Role separation. Admins can see BOTH sites (to approve hotels + preview),
  // so they're exempt from these redirects.
  const admin = !!profile?.is_admin;
  const hotelUser = isHotel(profile);
  const hotelOnCreatorRoute = !!user && hotelUser && !inHotelArea && !isPublic && !isRoot;
  const creatorInHotelArea = !!user && !hotelUser && !admin && inHotelArea;

  useEffect(() => {
    if (loading && !timedOut) return;

    if (isPublic) {
      // Bounce logged-in users off the login screen into their home site.
      if (user && pathname === "/login") {
        router.replace(isHotel(profile) ? "/hotel/profile" : "/dashboard");
      }
      return;
    }

    if (!user) {
      if (!isRoot) router.replace("/login");
      return;
    }

    // A logged-in hotel user landing anywhere in the creator app (including the
    // root search page) goes to the hotel site; a non-admin creator who wanders
    // into the hotel site gets sent back.
    if (hotelOnCreatorRoute || (user && hotelUser && isRoot)) { router.replace("/hotel/profile"); return; }
    if (creatorInHotelArea) { router.replace("/dashboard"); return; }
  }, [user, profile, loading, timedOut, pathname, router, isPublic, isRoot, hotelUser, hotelOnCreatorRoute, creatorInHotelArea]);

  // Always render login, waitlist, hotel sign-up and auth pages immediately
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

  // While a role-separation redirect is firing, render nothing to avoid a
  // flash of the wrong site.
  if (hotelOnCreatorRoute || creatorInHotelArea || (user && hotelUser && isRoot)) return null;

  return children;
}
