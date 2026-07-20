"use client";
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

const DONE_KEY = "dapples_tour_complete";
const STEP_KEY = "dapples_tour_step";

const NAV_SETTLE_MS = 500;   // grace period after a route change
const FIND_TIMEOUT_MS = 6000; // give up looking for a target after this
const GAP = 14;              // space between target and tooltip
const EDGE = 16;             // min distance from viewport edge

// Set a React-controlled input's value without React clobbering it — assigning
// .value directly doesn't fire React's onChange, so we go through the native
// setter and dispatch the event React actually listens for.
function setReactInputValue(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const STEPS = [
  {
    id: "welcome",
    center: true,
    title: "Welcome to Dapples! ✨",
    body: "Let's get you started. We'll walk you through everything you need to know in under 2 minutes.",
    next: "Let's go →",
  },
  {
    id: "search",
    route: "/",
    target: '[data-tour="search-input"]',
    title: "Find Hotels in Any Location",
    body: "Start by searching for hotels in any city or destination. We'll find 200+ properties instantly.",
    // Demo the search so the next step has real results to point at.
    action: (el) => {
      if (!el || el.value) return;
      setReactInputValue(el, "Byron Bay");
      setTimeout(() => {
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      }, 350);
    },
  },
  {
    id: "results",
    route: "/",
    target: '[data-tour="add-to-list"]',
    title: "Choose Your Hotels",
    body: "Browse through hotels and add the ones you want to reach out to. Click 'Add to List' to save them.",
    // Results are still loading when this step begins, so wait longer.
    findTimeout: 15000,
  },
  {
    id: "create-list",
    route: "/",
    target: '[data-tour="list-dropdown"]',
    title: "Create Your First List",
    body: "Organise your hotels into lists. For example 'Byron Bay Summer 2025'. You can have multiple lists for different trips or campaigns.",
    // Open the dropdown this step is pointing at.
    before: () => document.querySelector('[data-tour="add-to-list"]')?.click(),
  },
  {
    id: "lists",
    route: "/lists",
    target: '[data-tour="list-hotels"]',
    title: "Your Outreach Hub",
    body: "This is where you manage all your hotel contacts. Find emails, Instagram handles and track your outreach all in one place.",
  },
  {
    id: "contacts",
    route: "/lists",
    target: '[data-tour="find-contacts"]',
    title: "Find Contact Details Automatically",
    body: "Click these buttons and Dapples will automatically find email addresses and Instagram handles for every hotel in your list. No manual searching needed.",
  },
  {
    id: "flows",
    route: "/sequences/builder",
    target: '[data-tour="new-flow"]',
    title: "Create Your Outreach Flow",
    body: "Build a sequence of personalised emails that go out automatically. Write up to 3 emails with custom delays between each one.",
  },
  {
    id: "launch",
    route: "/sequences/builder",
    target: '[data-tour="launch-flow"]',
    title: "Launch Your Outreach",
    body: "When you're ready, launch your flow to a whole list or a single hotel. Dapples handles the sending automatically throughout the day.",
  },
  {
    id: "done",
    center: true,
    title: "You're All Set! 🎉",
    body: "Sit back and wait for the replies to come in. Dapples will automatically stop follow-up emails if a hotel replies. Good luck landing your first collaboration!",
    next: "Start Exploring →",
  },
];

export default function TourGuide() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);     // target position, null = centred
  const [ready, setReady] = useState(false);  // target resolved, safe to show
  const [confirmSkip, setConfirmSkip] = useState(false);

  const tipRef = useRef(null);
  const [tipSize, setTipSize] = useState({ w: 360, h: 200 });
  const cancelled = useRef(false);

  const step = STEPS[index];

  const endTour = useCallback((completed) => {
    cancelled.current = true;
    setActive(false);
    setConfirmSkip(false);
    setRect(null);
    setReady(false);
    try {
      localStorage.setItem(DONE_KEY, "true");
      localStorage.removeItem(STEP_KEY);
    } catch {}
  }, []);

  const startTour = useCallback(() => {
    try { localStorage.removeItem(DONE_KEY); localStorage.removeItem(STEP_KEY); } catch {}
    cancelled.current = false;
    setIndex(0);
    setConfirmSkip(false);
    setActive(true);
  }, []);

  // Auto-start on a first-time user, and expose a manual restart for the
  // sidebar button (which lives in a different component tree).
  useEffect(() => {
    if (loading || !user) return;
    let done = null, saved = null;
    try {
      done = localStorage.getItem(DONE_KEY);
      saved = localStorage.getItem(STEP_KEY);
    } catch { return; }

    if (!done) {
      const t = setTimeout(() => {
        cancelled.current = false;
        // Resume mid-tour if they refreshed partway through.
        const n = Number(saved);
        setIndex(Number.isInteger(n) && n > 0 && n < STEPS.length ? n : 0);
        setActive(true);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [user, loading]);

  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener("dapples:start-tour", handler);
    return () => window.removeEventListener("dapples:start-tour", handler);
  }, [startTour]);

  // Remember progress so a refresh resumes where they were.
  useEffect(() => {
    if (!active) return;
    try { localStorage.setItem(STEP_KEY, String(index)); } catch {}
  }, [active, index]);

  // Resolve the current step: navigate if needed, run its setup, then poll for
  // the target element. Anything that can't be found within the timeout falls
  // back to a centred tooltip rather than leaving the user stuck on a
  // half-rendered overlay.
  useEffect(() => {
    if (!active || !step) return;
    let raf = 0, timer = 0, poll = 0;
    setReady(false);
    setRect(null);

    if (step.route && step.route !== pathname) {
      router.push(step.route);
    }

    const begin = Date.now();
    const limit = step.findTimeout || FIND_TIMEOUT_MS;

    const resolve = () => {
      if (cancelled.current) return;

      if (step.center || !step.target) {
        setRect(null);
        setReady(true);
        return;
      }

      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        // Only accept a laid-out element; 0×0 means it's not painted yet.
        if (r.width > 0 && r.height > 0) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          // Let the scroll settle before measuring, or the ring lands wrong.
          timer = setTimeout(() => {
            if (cancelled.current) return;
            setRect(el.getBoundingClientRect());
            setReady(true);
          }, 320);
          return;
        }
      }

      if (Date.now() - begin > limit) {
        // Couldn't find it — show the copy centred so the tour still works.
        setRect(null);
        setReady(true);
        return;
      }
      poll = setTimeout(resolve, 150);
    };

    // Give navigation time to commit, run any setup, then look for the target.
    timer = setTimeout(() => {
      if (cancelled.current) return;
      try { step.before?.(); } catch {}
      raf = requestAnimationFrame(resolve);
    }, step.route && step.route !== pathname ? NAV_SETTLE_MS : 80);

    return () => {
      clearTimeout(timer);
      clearTimeout(poll);
      cancelAnimationFrame(raf);
    };
    // pathname is intentionally included: re-resolve once navigation lands.
  }, [active, index, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire the step's demo action once its target is on screen.
  useEffect(() => {
    if (!active || !ready || !step?.action) return;
    const el = step.target ? document.querySelector(step.target) : null;
    try { step.action(el); } catch {}
  }, [active, ready, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the ring glued to the target while the page moves under it.
  useEffect(() => {
    if (!active || !ready || !step?.target || step.center) return;
    const update = () => {
      const el = document.querySelector(step.target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, ready, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!tipRef.current) return;
    const r = tipRef.current.getBoundingClientRect();
    setTipSize({ w: r.width, h: r.height });
  }, [index, ready, confirmSkip]);

  if (!active || !user || !step) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Position the tooltip: below the target by default, flipped above when the
  // target sits in the lower half, and always clamped inside the viewport.
  let tipStyle;
  if (!rect) {
    tipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const below = rect.bottom + GAP;
    const above = rect.top - tipSize.h - GAP;
    const placeAbove = rect.top + rect.height / 2 > vh / 2 && above > EDGE;
    let top = placeAbove ? above : below;
    top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - tipSize.h - EDGE));

    let left = rect.left + rect.width / 2 - tipSize.w / 2;
    left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - tipSize.w - EDGE));
    tipStyle = { top, left };
  }

  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  const pad = 6;

  return (
    <>
      <style>{`
        @keyframes dpTourPulse {
          0%   { box-shadow: 0 0 0 0 rgba(201,110,60,0.55); }
          70%  { box-shadow: 0 0 0 12px rgba(201,110,60,0); }
          100% { box-shadow: 0 0 0 0 rgba(201,110,60,0); }
        }
        .dp-tour-ring { animation: dpTourPulse 1.5s infinite; }
        .dp-tour-tip  { transition: top .3s ease, left .3s ease; }
      `}</style>

      {/* Backdrop. When a target is highlighted we cut a hole in the overlay
          with a huge box-shadow spread instead of raising the element's
          z-index — the app styles elements inline and lifting them would mean
          mutating another component's DOM and risking layout shifts. */}
      {rect && ready ? (
        <div
          className="dp-tour-ring"
          style={{
            position: "fixed",
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: 12,
            border: "3px solid var(--color-accent-terracotta)",
            boxShadow: "0 0 0 9999px rgba(43,39,34,0.5)",
            zIndex: 9999,
            pointerEvents: "none",
            transition: "top .3s ease, left .3s ease, width .3s ease, height .3s ease",
          }}
        />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,39,34,0.5)", zIndex: 9999 }} />
      )}

      {/* Tooltip */}
      {ready && (
        <div ref={tipRef} className="dp-tour-tip" style={{ ...tip.card, ...tipStyle }}>
          {!isLast && !confirmSkip && (
            <button style={tip.skip} onClick={() => setConfirmSkip(true)}>Skip</button>
          )}
          <span style={tip.counter}>{index + 1} of {STEPS.length}</span>

          {confirmSkip ? (
            <>
              <h3 style={tip.title}>Skip the tour?</h3>
              <p style={tip.body}>You can restart it anytime from the sidebar.</p>
              <div style={tip.footer}>
                <button style={tip.secondary} onClick={() => setConfirmSkip(false)}>Continue Tour</button>
                <button style={tip.primary} onClick={() => endTour(false)}>Skip Tour</button>
              </div>
            </>
          ) : (
            <>
              <h3 style={tip.title}>{step.title}</h3>
              <p style={tip.body}>{step.body}</p>
              <div style={tip.footer}>
                {!isFirst && (
                  <button style={tip.secondary} onClick={() => setIndex(i => Math.max(0, i - 1))}>← Back</button>
                )}
                <button
                  style={{ ...tip.primary, marginLeft: "auto" }}
                  onClick={() => (isLast ? endTour(true) : setIndex(i => i + 1))}
                >
                  {step.next || "Next →"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

const tip = {
  card: {
    position: "fixed",
    zIndex: 10000,
    width: "min(360px, calc(100vw - 32px))",
    background: "var(--color-ground-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-card)",
    boxShadow: "var(--shadow-popup)",
    padding: 24,
    fontFamily: "var(--font-body)",
  },
  counter: { position: "absolute", top: 12, right: 14, fontSize: 11, color: "var(--color-ink-muted)" },
  skip: {
    position: "absolute", top: 26, right: 14,
    background: "none", border: "none", cursor: "pointer",
    fontSize: 11, color: "var(--color-ink-muted)", fontFamily: "inherit", padding: 0,
    textDecoration: "underline",
  },
  title: {
    fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700,
    color: "var(--color-ink-primary)", marginBottom: 8, paddingRight: 46, lineHeight: 1.3,
  },
  body: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.7, marginBottom: 18 },
  footer: { display: "flex", alignItems: "center", gap: 8 },
  primary: {
    background: "var(--color-accent-terracotta)", color: "var(--color-ground-page)",
    border: "none", borderRadius: "var(--radius-md)", padding: "10px 20px",
    fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)",
    whiteSpace: "nowrap",
  },
  secondary: {
    background: "var(--color-ground-card)", color: "var(--color-ink-primary)",
    border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)",
    padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", whiteSpace: "nowrap",
  },
};
