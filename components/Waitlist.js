"use client";
import { useState } from "react";
import { Quicksand, Nunito_Sans } from "next/font/google";

// ── Dapples brand fonts ──────────────────────────────────────────────────
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand", display: "swap" });
const nunito = Nunito_Sans({ subsets: ["latin"], weight: ["300", "400", "600", "700", "800"], variable: "--font-nunito", display: "swap" });

const HEAD = "var(--font-quicksand), 'Quicksand', system-ui, sans-serif";
const BODY = "var(--font-nunito), 'Nunito Sans', system-ui, sans-serif";

// ── Content ──────────────────────────────────────────────────────────────
const STEPS = [
  ["1", "Search for hotels", "Search hotels, boutique stays and apartments by location."],
  ["2", "Build your list", "Save your favourites to easily track."],
  ["3", "Find contact details", "Search for contact details and Instagram handle."],
  ["4", "Send pitches", "Launch personal email sequences that reach the right person and follow up for you."],
];

const COMPARE = [
  ["Find hotel contact details", "Hours of research", "Done in seconds"],
  ["Discover hotels anywhere", "Endless Maps scrolling", "200+ results instantly"],
  ["Send personalised outreach", "Copy paste each email", "Automated sequences"],
  ["Follow up automatically", "Easy to forget", "Runs while you sleep"],
  ["Track replies & progress", "Messy spreadsheets", "Built-in dashboard"],
];

// Scattered "golden-hour" light dots behind the wordmark.
function Wordmark({ size, dots }) {
  return (
    <span style={{ position: "relative", display: "inline-block", fontFamily: HEAD, fontWeight: 600, fontSize: size, letterSpacing: "-0.02em", color: "#2B2722", lineHeight: 1 }}>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: "absolute", top: d.top, left: d.left, right: d.right,
          width: `${d.d}em`, height: `${d.d}em`, borderRadius: "50%",
          background: d.c, opacity: d.o, filter: `blur(${d.b}px)`, pointerEvents: "none",
        }} />
      ))}
      <span style={{ position: "relative" }}>Dapples</span>
    </span>
  );
}

const HEADER_DOTS = [
  { top: "-0.24em", left: "4%", d: 0.30, c: "#F4C97A", o: 0.8, b: 4 },
  { top: "0.30em", left: "30%", d: 0.16, c: "#E5A04A", o: 0.65, b: 2 },
  { top: "-0.16em", left: "58%", d: 0.22, c: "#C9D1A8", o: 0.75, b: 3 },
  { top: "0.46em", left: "72%", d: 0.14, c: "#FDEBBE", o: 0.9, b: 2 },
  { top: "-0.24em", right: "2%", d: 0.20, c: "#EBA94E", o: 0.6, b: 3 },
];
const FOOTER_DOTS = [
  { top: "-0.24em", left: "4%", d: 0.30, c: "#F4C97A", o: 0.8, b: 1.5 },
  { top: "0.16em", left: "56%", d: 0.22, c: "#C9D1A8", o: 0.75, b: 1 },
];

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: persist to the real waitlist backend when it's available.
    setDone(true);
  };

  return (
    <main className={`${quicksand.variable} ${nunito.variable}`} style={s.page}>
      <style>{css}</style>

      {/* ── Nav ── */}
      <div style={s.nav}>
        <div style={s.navGlow}>
          <span style={{ ...glow, top: -30, left: "10%", width: 160, height: 160, background: "#F0B979", opacity: 0.4, filter: "blur(50px)" }} />
          <span style={{ ...glow, bottom: -40, right: "12%", width: 180, height: 180, background: "#E5A04A", opacity: 0.3, filter: "blur(55px)" }} />
          <span style={{ ...glow, top: "20%", left: "35%", width: 100, height: 100, background: "#C9D1A8", opacity: 0.25, filter: "blur(46px)" }} />
        </div>
        <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "40px 24px" }}>
          <Wordmark size="clamp(40px, 8vw, 56px)" dots={HEADER_DOTS} />
        </div>
      </div>

      {/* ── Hero ── */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <span style={{ ...glow, top: -40, right: "6%", width: 220, height: 220, background: "#F4C97A", opacity: 0.45, filter: "blur(60px)" }} />
          <span style={{ ...glow, top: "40%", right: "30%", width: 120, height: 120, background: "#E5A04A", opacity: 0.28, filter: "blur(46px)" }} />
          <span style={{ ...glow, bottom: -30, left: "8%", width: 150, height: 150, background: "#C9D1A8", opacity: 0.3, filter: "blur(50px)" }} />
        </div>
        <div className="dpl-pad dpl-hero" style={s.hero}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <h1 style={s.h1}>The outreach workspace to land hotel collabs</h1>
              <p style={s.h1sub}>A quick and easy way to search, contact and track your outreach</p>
            </div>

            {done ? (
              <div style={s.doneCard}>
                <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 700, color: "#2B2722", marginBottom: 5 }}>You&apos;re on the list.</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "#6B6258" }}>
                  We&apos;ll reach out as founding spots open — lifetime Pro access is yours, and we&apos;d love your voice in shaping it.
                </div>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 2 }}>
                <div style={s.formRow}>
                  <input
                    className="dpl-in" type="email" required placeholder="you@studio.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address"
                    style={s.input}
                  />
                  <button type="submit" className="dpl-primary" style={s.primaryBtn}>Join waitlist</button>
                </div>
                <p style={s.founding}>
                  Founding creators get <b style={{ color: "#2B2722" }}>lifetime Pro access pricing</b> and a direct hand in shaping the product.
                </p>
              </form>
            )}
          </div>

          {/* Right column — product screenshot in a browser frame */}
          <div style={s.browser}>
            <div style={s.browserBar}>
              <span style={{ ...s.browserDot, background: "#E0954A" }} />
              <span style={{ ...s.browserDot, background: "#8B9A6A" }} />
              <span style={{ ...s.browserDot, background: "#ECD9B8" }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: "#C8C2B2", fontWeight: 600 }}>app.dapples.co</span>
            </div>
            <img src="/dapples-preview.webp" alt="Dapples hotel search and map view" style={s.browserImg} />
          </div>
        </div>
      </section>

      {/* ── Pain point ── */}
      <section className="dpl-pad" style={s.painWrap}>
        <h2 style={s.painH}>Are you a travel creator, wanting to work with hotels and unique stays?</h2>
        <p style={s.painSub}>Dapples turns the whole grind of finding hotels and their contacts into a few clicks — here&apos;s how it works.</p>
      </section>

      {/* ── How it works ── */}
      <section className="dpl-pad dpl-steps" style={s.steps}>
        {STEPS.map(([n, title, desc]) => (
          <div key={n} style={s.stepCard}>
            <div style={s.stepNum}>{n}</div>
            <div style={{ fontFamily: HEAD, fontSize: 19, fontWeight: 600, color: "#2B2722", marginTop: 4 }}>{title}</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "#6B6258" }}>{desc}</div>
          </div>
        ))}
      </section>

      {/* ── Why Dapples? comparison ── */}
      <section className="dpl-pad" style={{ position: "relative", overflow: "hidden", padding: "52px 0" }}>
        <span style={{ ...glow, top: -30, right: "2%", width: 220, height: 220, background: "#F4C97A", opacity: 0.32, filter: "blur(70px)" }} />
        <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
          <div style={{ fontFamily: HEAD, fontSize: "clamp(26px, 4vw, 32px)", fontWeight: 700, letterSpacing: "-0.01em", color: "#2B2722" }}>Why Dapples?</div>
          <div style={{ fontSize: 16, color: "#6B6258", marginTop: 8, lineHeight: 1.5 }}>Stop wasting hours on outreach.<br />Start landing collaborations.</div>
        </div>
        <div style={s.table}>
          <div />
          <div style={s.colHManual}>Manually</div>
          <div style={s.colHDapples}>Dapples</div>
          {COMPARE.map(([label, bad, good], i) => (
            <div key={label} style={{ display: "contents" }}>
              <div style={s.rowSep} />
              <div style={s.cellLabel}>{label}</div>
              <div style={s.cellManual}><span style={{ fontSize: 16 }}>❌</span><span style={{ fontSize: 12, color: "#9C9388" }}>{bad}</span></div>
              <div style={{ ...s.cellDapples, ...dapplesBg(i, COMPARE.length) }}><span style={{ fontSize: 16 }}>✅</span><span style={{ fontSize: 12, fontWeight: 700, color: "#8B5E2A" }}>{good}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Founder note ── */}
      <section className="dpl-pad" style={s.founder}>
        <div style={s.founderAvatar} aria-hidden>C</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#B5702E" }}>A note from the founder</div>
          <div style={{ fontFamily: HEAD, fontSize: "clamp(18px, 2.6vw, 22px)", fontWeight: 500, lineHeight: 1.5, color: "#2B2722", letterSpacing: "-0.01em", maxWidth: "60ch" }}>
            Dapples started when I realised finding and pitching to 100+ hotels for collabs on a single trip to Europe would take forever. So I created a visual, fast, and fun way to do it. It worked: 3 hotel collabs, thousands saved.
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#6B6258" }}>Charles — Founder, Dapples</div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="dpl-pad" style={s.footer}>
        <Wordmark size={17} dots={FOOTER_DOTS} />
        <span style={{ fontSize: 13, color: "#9C9388" }}>Where great stays meet great storytellers.</span>
      </footer>
    </main>
  );
}

// Continuous tinted highlight strip down the Dapples column.
function dapplesBg(i, len) {
  if (i === 0) return { background: "linear-gradient(180deg,rgba(224,149,74,0.14),rgba(224,149,74,0.05))", borderRadius: "12px 12px 0 0" };
  if (i === len - 1) return { background: "linear-gradient(0deg,rgba(224,149,74,0.14),rgba(224,149,74,0.05))", borderRadius: "0 0 12px 12px" };
  return { background: "rgba(224,149,74,0.1)" };
}

const glow = { position: "absolute", borderRadius: "50%", pointerEvents: "none" };

const s = {
  page: { minHeight: "100vh", background: "#FBF5EA", fontFamily: BODY, color: "#2B2722", overflowX: "hidden" },

  nav: { position: "relative", overflow: "hidden", background: "#FBF0DA", borderBottom: "1px solid rgba(43,39,34,0.10)" },
  navGlow: { position: "absolute", inset: 0, pointerEvents: "none" },

  hero: { position: "relative", maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, padding: "60px 0", alignItems: "center" },
  h1: { fontFamily: HEAD, fontSize: "clamp(32px, 5vw, 46px)", fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#2B2722" },
  h1sub: { fontSize: 17, lineHeight: 1.6, color: "#6B6258", maxWidth: "46ch", marginTop: 14 },
  formRow: { display: "flex", gap: 11, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 200, background: "#FFFCF4", border: "1.5px solid #DDD0B8", borderRadius: 14, padding: "15px 17px", fontSize: 15, color: "#2B2722", fontFamily: BODY, outline: "none" },
  primaryBtn: { background: "#44503A", color: "#FBF5EA", border: "none", borderRadius: 14, padding: "15px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: HEAD },
  founding: { fontSize: 15, lineHeight: 1.5, color: "#6B6258", fontWeight: 700 },
  doneCard: { background: "#FFFCF4", border: "1px solid rgba(43,39,34,0.08)", borderRadius: 18, padding: "22px 24px", boxShadow: "0 18px 40px -34px rgba(120,80,30,0.55)" },

  browser: { borderRadius: 20, overflow: "hidden", boxShadow: "0 26px 56px -34px rgba(120,80,30,0.6)", border: "1px solid rgba(43,39,34,0.08)" },
  browserBar: { background: "#44503A", padding: "11px 15px", display: "flex", alignItems: "center", gap: 7 },
  browserDot: { width: 10, height: 10, borderRadius: "50%" },
  browserImg: { width: "100%", display: "block", aspectRatio: "985 / 640", objectFit: "cover", objectPosition: "top" },

  painWrap: { maxWidth: 1120, margin: "0 auto", padding: "56px 0 44px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 },
  painH: { fontFamily: HEAD, fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.01em", maxWidth: "40ch", color: "#2B2722" },
  painSub: { fontSize: 18, lineHeight: 1.6, color: "#6B6258", maxWidth: "54ch" },

  steps: { background: "#F3E7CF", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, padding: "52px 0", marginLeft: 0 },
  stepCard: { background: "#FFFCF4", border: "1px solid rgba(43,39,34,0.07)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 9, boxShadow: "0 18px 40px -36px rgba(120,80,30,0.55)" },
  stepNum: { width: 38, height: 38, borderRadius: 12, background: "rgba(224,149,74,0.16)", color: "#C96E3C", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HEAD, fontWeight: 700, fontSize: 16 },

  table: { maxWidth: 760, margin: "0 auto", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", position: "relative" },
  colHManual: { textAlign: "center", fontSize: 12, fontWeight: 700, color: "#9C9388", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10 },
  colHDapples: { textAlign: "center", fontSize: 12, fontWeight: 700, color: "#B5702E", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10 },
  rowSep: { gridColumn: "1/4", height: 1, background: "rgba(43,39,34,0.08)" },
  cellLabel: { display: "flex", alignItems: "center", fontSize: 14.5, fontWeight: 600, padding: "16px 4px" },
  cellManual: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "16px 4px" },
  cellDapples: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "16px 4px" },

  founder: { maxWidth: 1120, margin: "0 auto", padding: "56px 0", display: "flex", gap: 26, alignItems: "flex-start" },
  founderAvatar: { width: 82, height: 82, flex: "none", borderRadius: "50%", background: "linear-gradient(160deg,#F4C97A,#E5A04A)", color: "#FBF5EA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HEAD, fontSize: 34, fontWeight: 700 },

  footer: { maxWidth: 1120, margin: "0 auto", padding: "24px 0", borderTop: "1px solid rgba(43,39,34,0.10)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
};

const css = `
  .dpl-pad { padding-left: clamp(24px, 5vw, 52px); padding-right: clamp(24px, 5vw, 52px); }
  .dpl-primary { transition: background .18s ease, transform .18s ease; }
  .dpl-primary:hover { background: #363F2E !important; }
  .dpl-primary:active { transform: translateY(1px); }
  .dpl-in:focus { border-color: #B5702E !important; }
  .dpl-in::placeholder { color: #B6AD9C; }
  @media (max-width: 900px) {
    .dpl-hero { grid-template-columns: 1fr !important; gap: 36px !important; padding: 44px 0 !important; }
    .dpl-steps { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 560px) {
    .dpl-steps { grid-template-columns: 1fr !important; }
  }
`;
