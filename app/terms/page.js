export const metadata = {
  title: "Terms of Service — Dapples",
  description: "The terms that apply when you use Dapples.",
};

const UPDATED = "17 November 2026";

export default function TermsPage() {
  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <a href="/" style={s.back}>← Dapples</a>
        <h1 style={s.h1}>Terms of Service</h1>
        <p style={s.meta}>Last updated: {UPDATED}</p>

        <p style={s.p}>
          These terms apply when you use Dapples (&ldquo;Dapples&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), including our website, creator
          workspace, hotel outreach tools and job board (the &ldquo;Service&rdquo;). By creating an account or using the Service you agree to
          these terms and to our <a style={s.a} href="/privacy">Privacy Policy</a>. If you don&rsquo;t agree, please don&rsquo;t use Dapples.
        </p>

        <h2 style={s.h2}>1. Who can use Dapples</h2>
        <ul style={s.ul}>
          <li>You must be 18 or older and able to enter a binding agreement.</li>
          <li>Dapples has two kinds of accounts: <b>creators</b> (people who make content) and <b>hotels</b> (accommodation providers). Hotel accounts are reviewed and approved by us before they can publish opportunities.</li>
          <li>Give us accurate information, keep your password secure, and tell us if you think your account has been accessed without permission. You are responsible for activity on your account.</li>
        </ul>

        <h2 style={s.h2}>2. What Dapples does</h2>
        <p style={s.p}>
          Dapples helps creators research hotels, find publicly available contact details, organise lists and send outreach emails
          from their own email account, and it provides a job board where approved hotels post opportunities and creators apply and message.
          We may change, add or remove features at any time.
        </p>

        <h2 style={s.h2}>3. Plans and payment</h2>
        <ul style={s.ul}>
          <li>Creators on the free Spark plan can use the job board and apply to opportunities. Paid plans (such as Glow and Radiant) unlock the hotel outreach workspace.</li>
          <li>Paid plans are billed in advance at the price shown when you subscribe, and may begin with a free trial that requires a payment card. Unless you cancel before the trial ends, your plan will continue and your card will be charged.</li>
          <li>You can cancel at any time; your plan stays active until the end of the period you&rsquo;ve paid for. Except where the law requires otherwise, fees already paid are not refundable.</li>
          <li>We may change prices with reasonable notice. Founding-member pricing, where offered, is honoured for as long as the member keeps their account in good standing.</li>
        </ul>

        <h2 style={s.h2}>4. Using email outreach responsibly</h2>
        <p style={s.p}>When you send outreach through Dapples, the emails go from your own email account and you are the sender. You agree to:</p>
        <ul style={s.ul}>
          <li>Contact businesses only about genuine collaboration or partnership opportunities.</li>
          <li>Follow the anti-spam and privacy laws that apply to you and your recipients (for example the Australian Spam Act 2003, CAN-SPAM, and GDPR/PECR), identify yourself accurately, and stop contacting anyone who asks you to.</li>
          <li>Not send misleading, deceptive, harassing, unlawful or bulk unsolicited messages.</li>
          <li>Respect the sending limit. Dapples allows a maximum of 30 outreach emails per day on every plan, and spaces them out to protect your account.</li>
        </ul>
        <p style={s.p}>
          Your email provider (such as Google) has its own rules. We aren&rsquo;t responsible if your provider limits, flags or suspends your account.
          Sending outreach is at your own risk.
        </p>

        <h2 style={s.h2}>5. The job board and collaborations</h2>
        <ul style={s.ul}>
          <li>Dapples is a platform that connects creators and hotels. We are <b>not a party</b> to any collaboration, stay, payment or agreement between a creator and a hotel, and we don&rsquo;t guarantee that any opportunity, application or collaboration will lead to a result.</li>
          <li>Creators and hotels are responsible for agreeing the terms of each collaboration (including deliverables, usage rights, stays, payment and timelines) and for paying and receiving what they agree.</li>
          <li>We review hotel accounts before they publish, but we can&rsquo;t verify every listing or user. Use your judgment, and report anything suspicious to us.</li>
          <li>Reviews must be honest and based on a real collaboration.</li>
        </ul>

        <h2 style={s.h2}>6. Your content</h2>
        <p style={s.p}>
          You keep ownership of the content you upload or write (such as profiles, photos, videos, media kits, pitches and messages). You give Dapples a
          non-exclusive, worldwide licence to host, store, display and process that content only to run and improve the Service, including showing it
          to the hotels or creators you choose to share it with. You promise that you have the rights to what you upload and that it doesn&rsquo;t
          infringe anyone else&rsquo;s rights or break the law.
        </p>

        <h2 style={s.h2}>7. Hotel and contact information</h2>
        <p style={s.p}>
          Hotel details, ratings, photos and contact information in Dapples come from public sources and third-party providers. We try to keep it
          useful but don&rsquo;t guarantee that it is complete, current or accurate, or that an email address or Instagram handle belongs to the right
          person. Check details before relying on them.
        </p>

        <h2 style={s.h2}>8. What you can&rsquo;t do</h2>
        <ul style={s.ul}>
          <li>Break the law or use Dapples to harass, defraud, impersonate or spam others.</li>
          <li>Scrape, copy, resell or bulk-export Dapples data, or use it to build a competing database or service.</li>
          <li>Try to access other users&rsquo; accounts or data, bypass limits or security, interfere with the Service, or test its security without our written permission.</li>
          <li>Share an account between people or use automation to apply to opportunities or message users at scale.</li>
          <li>Upload malicious code, or content that is unlawful, hateful, sexually explicit or infringing.</li>
        </ul>

        <h2 style={s.h2}>9. Our intellectual property</h2>
        <p style={s.p}>
          Dapples, its name, logo, design and software are owned by us or our licensors. These terms don&rsquo;t give you any ownership of them. You may use the
          Service as intended while your account is active.
        </p>

        <h2 style={s.h2}>10. Third-party services</h2>
        <p style={s.p}>
          Dapples relies on third parties such as Google (sign-in, Gmail, Maps and Places), Supabase, Vercel and others described in our Privacy Policy. Your use of
          those services may be subject to their own terms, and outages or changes by them can affect Dapples.
        </p>

        <h2 style={s.h2}>11. Suspension and ending your account</h2>
        <p style={s.p}>
          You can delete your account at any time from the app. We may suspend or end accounts that break these terms, put other users or the Service at
          risk, or fail to pay, and we may remove content or opportunities for the same reasons. Sections that by their nature should continue (such as content licences already granted for ongoing collaborations, disclaimers and liability limits) survive ending your account.
        </p>

        <h2 style={s.h2}>12. Disclaimers and limits on liability</h2>
        <p style={s.p}>
          Dapples is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent permitted by law we don&rsquo;t promise that the Service will be uninterrupted or error-free, or that it
          will get you collaborations, replies or any particular outcome.
        </p>
        <p style={s.p}>
          Nothing in these terms excludes or limits any right you have under the Australian Consumer Law or other laws that can&rsquo;t be excluded. Subject to that,
          we are not liable for indirect or consequential loss, lost profits, lost opportunities or loss of data, and our total liability to you for any claim
          relating to the Service is limited to the amount you paid us in the 12 months before the claim (or AUD $100 if you are on a free plan). Where the law allows, our liability for
          breach of a consumer guarantee that can&rsquo;t be excluded is limited to resupplying the Service or paying the cost of having it resupplied.
        </p>
        <p style={s.p}>You agree to cover reasonable losses we suffer because you broke these terms or the law, or because of content you uploaded or messages you sent.</p>

        <h2 style={s.h2}>13. Changes to these terms</h2>
        <p style={s.p}>
          We may update these terms as Dapples grows. We&rsquo;ll change the date above and, for significant changes, notify you by email or in the app. If you keep using the
          Service after a change takes effect, you accept the updated terms.
        </p>

        <h2 style={s.h2}>14. Governing law</h2>
        <p style={s.p}>These terms are governed by the laws of New South Wales, Australia, and you agree to the non-exclusive jurisdiction of the courts of New South Wales.</p>

        <h2 style={s.h2}>15. Contact</h2>
        <p style={s.p}>Questions about these terms: <a style={s.a} href="mailto:hello@dapples.io">hello@dapples.io</a>.</p>
      </div>
    </main>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-ground-page)", color: "var(--color-ink-primary)", fontFamily: "var(--font-body)", padding: "40px 20px 80px" },
  wrap: { maxWidth: 760, margin: "0 auto" },
  back: { display: "inline-block", fontSize: 13, fontWeight: 700, color: "var(--color-ink-mid)", textDecoration: "none", marginBottom: 20 },
  h1: { fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 },
  meta: { fontSize: 13, color: "var(--color-ink-muted)", marginBottom: 24 },
  h2: { fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, margin: "30px 0 10px" },
  p: { fontSize: 15, lineHeight: 1.7, color: "var(--color-ink-mid)", marginBottom: 12 },
  ul: { fontSize: 15, lineHeight: 1.7, color: "var(--color-ink-mid)", paddingLeft: 22, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 },
  a: { color: "var(--color-accent-amber-deep)", fontWeight: 600 },
};
