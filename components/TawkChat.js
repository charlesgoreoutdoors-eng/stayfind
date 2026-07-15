"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

const TAWK_PROPERTY_ID = "6a571a436076b81d4b6681e1";
const TAWK_WIDGET_ID = "1jti3t69n";

// Chat should never show on the login/auth screens.
const isExcludedPath = (pathname) =>
  pathname === "/login" || pathname.startsWith("/auth");

export default function TawkChat() {
  const { user, profile } = useAuth();
  const pathname = usePathname();

  const shouldShow = !!user && !isExcludedPath(pathname);

  // Load the widget (once) and keep visitor attributes in sync while the
  // user is logged in on a non-excluded page.
  useEffect(() => {
    if (!shouldShow) return;

    const rawPlan = profile?.plan || "spark";
    const identity = {
      name: profile?.full_name || user?.email || "",
      email: user?.email || "",
      plan: rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1),
      member_since: profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString()
        : "",
    };

    const identify = () => {
      if (!window.Tawk_API || !window.Tawk_API.setAttributes) return;
      window.Tawk_API.setAttributes(identity, function (error) {});
    };

    if (!document.getElementById("tawk-script")) {
      // First load — inject the tawk.to embed and identify on load.
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();
      window.Tawk_API.onLoad = identify;

      const s1 = document.createElement("script");
      s1.id = "tawk-script";
      s1.async = true;
      s1.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
      s1.charset = "UTF-8";
      s1.setAttribute("crossorigin", "*");
      document.body.appendChild(s1);
    } else {
      // Already loaded — re-show and refresh attributes (e.g. after
      // navigating back from an excluded page or when profile loads).
      identify();
      if (window.Tawk_API?.showWidget) window.Tawk_API.showWidget();
    }
  }, [shouldShow, user, profile]);

  // Hide the bubble on excluded pages / when logged out.
  useEffect(() => {
    if (shouldShow) return;
    if (window.Tawk_API?.hideWidget) window.Tawk_API.hideWidget();
  }, [shouldShow]);

  return null;
}
