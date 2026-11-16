export const metadata = {
  title: "Privacy Policy — Dapples",
  description: "How Dapples collects, uses and protects your information.",
};

const UPDATED = "17 November 2026";

export default function PrivacyPage() {
  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <a href="/" style={s.back}>← Dapples</a>
        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.meta}>Last updated: {UPDATED}</p>

        <p style={s.p}>
          Dapples (&ldquo;Dapples&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a research and outreach platform that helps content creators
          find hotels and land collaborations, and that connects creators with hotels through a job board. Dapples is operated from
          Sydney, Australia. This policy explains what personal information we collect, why, who we share it with, and the choices you have.
          If you have questions, email <a style={s.a} href="mailto:hello@dapples.io">hello@dapples.io</a>.
        </p>

        <h2 style={s.h2}>1. Information we collect</h2>
        <p style={s.p}><b>Information you give us</b></p>
        <ul style={s.ul}>
          <li>Account details: name, email address and password (or Google sign-in), and your role (creator or hotel).</li>
          <li>Creator profile: location, creator type, experience level, content categories, audience, social handles, follower count, portfolio photos, videos and media kits, and your preferences.</li>
          <li>Hotel profile: property name, location, website, logo, photos and the opportunities you post.</li>
          <li>Applications and messages between creators and hotels, pitches, submitted content links, and reviews.</li>
          <li>Outreach content you write: email templates, sequences, notes and lists of hotels you save.</li>
          <li>Your waitlist sign-up email address, if you joined our waitlist.</li>
        </ul>
        <p style={s.p}><b>Information from connected accounts</b></p>
        <ul style={s.ul}>
          <li>
            If you connect Gmail, we receive an access token that lets Dapples send the emails in your sequences from your own Gmail
            account and detect replies to those emails. We store the token securely. We do not read or store the rest of your mailbox.
          </li>
          <li>If you sign in with Google, we receive your name, email address and Google account identifier.</li>
        </ul>
        <p style={s.p}><b>Information collected automatically</b></p>
        <ul style={s.ul}>
          <li>Basic usage and technical data such as pages visited, device and browser type, and error logs, used to run and improve the service.</li>
          <li>Cookies and similar local storage needed to keep you signed in and remember your settings.</li>
        </ul>
        <p style={s.p}><b>Information about hotels and public contacts</b></p>
        <ul style={s.ul}>
          <li>
            To help creators reach out, we gather publicly available business information about hotels and accommodation, such as name,
            address, website, ratings, photos, business contact emails, and public Instagram handles. This comes from Google Places,
            hotels&rsquo; own public websites, and a contact-data provider (Hunter). It relates to businesses and, where applicable,
            people in business roles, and is used only to support outreach.
          </li>
        </ul>

        <h2 style={s.h2}>2. How we use information</h2>
        <ul style={s.ul}>
          <li>To provide the service: search, lists, contact finding, email sequences, the job board, applications and messaging.</li>
          <li>To send the emails you ask us to send, at the times and limits you set (no more than 30 outreach emails per day).</li>
          <li>To show hotels the creator information that creators have chosen to make available (for example when you apply to a job or set your profile to discoverable).</li>
          <li>To secure the service, prevent abuse, fix problems and provide support.</li>
          <li>To communicate with you about your account, updates, and (where you have agreed) news about Dapples.</li>
          <li>To meet legal obligations.</li>
        </ul>
        <p style={s.p}>We do not sell your personal information, and we do not use it for advertising.</p>

        <h2 style={s.h2}>3. Google user data</h2>
        <p style={s.p}>
          Dapples&rsquo; use and transfer of information received from Google APIs adheres to the{" "}
          <a style={s.a} href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>,
          including the Limited Use requirements. Specifically:
        </p>
        <ul style={s.ul}>
          <li>We use Gmail access only to send the outreach emails you create and to detect replies to them, so we can stop a sequence and show you the reply.</li>
          <li>We do not use Google user data for advertising, and we do not sell it.</li>
          <li>We do not allow humans to read your Gmail data unless you give us permission for specific messages, it is needed for security or to comply with law, or it is aggregated and anonymised for internal operations.</li>
          <li>You can disconnect Gmail at any time in the app, or revoke access at <a style={s.a} href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>.</li>
        </ul>

        <h2 style={s.h2}>4. Who we share information with</h2>
        <p style={s.p}>We share information only as needed to run Dapples:</p>
        <ul style={s.ul}>
          <li><b>Hotels and creators:</b> when a creator applies to a job or messages a hotel, the hotel sees the pitch, profile, portfolio and follower information the creator has provided. Hotels see profiles of creators who have set their profile to discoverable.</li>
          <li><b>Service providers</b> who process data for us: Supabase (database, authentication and file storage), Vercel (hosting), Google (sign-in, Gmail, Places and Maps), Hunter (business contact data), Browserless (loading hotel websites to find public contact details), ConvertKit (waitlist and email updates), and tawk.to (live chat). Payment processing will be provided by Stripe when paid plans open.</li>
          <li><b>Legal and safety:</b> when required by law, or to protect the rights, safety and security of users or Dapples.</li>
          <li><b>Business transfer:</b> if Dapples is acquired or merges, your information may transfer to the new owner under the same protections.</li>
        </ul>
        <p style={s.p}>Some of these providers are located outside Australia, including in the United States, so your information may be processed overseas.</p>

        <h2 style={s.h2}>5. Emails you send through Dapples</h2>
        <p style={s.p}>
          When you send outreach, you are the sender and responsible for your messages. Use the service only to contact businesses
          about genuine collaboration, follow the anti-spam laws that apply to you (such as the Australian Spam Act 2003, CAN-SPAM and GDPR/PECR), identify
          yourself accurately, and stop contacting anyone who asks you to.
        </p>

        <h2 style={s.h2}>6. How long we keep information</h2>
        <p style={s.p}>
          We keep account information while your account is active. Search results and contact lookups are cached for a limited
          time (up to 90 days) to keep the service fast and to control costs. When you delete your account we delete your
          profile and the content you created; some information may remain in backups for a short period, and we may keep
          limited records where the law requires.
        </p>

        <h2 style={s.h2}>7. Security</h2>
        <p style={s.p}>
          We protect information with access controls, encryption in transit, and database rules that restrict each user to
          their own data. Gmail tokens and other sensitive records are kept server-side and are not readable from the browser. No
          system is perfectly secure, so please use a strong, unique password.
        </p>

        <h2 style={s.h2}>8. Your choices and rights</h2>
        <ul style={s.ul}>
          <li>Access and correct your information in your account settings, or ask us for a copy.</li>
          <li>Delete your account from the app, or by emailing us. This removes your profile and content.</li>
          <li>Change whether your creator profile is discoverable by hotels in your preferences.</li>
          <li>Disconnect Gmail and other connected accounts at any time.</li>
          <li>Unsubscribe from marketing emails using the link in any email we send.</li>
          <li>If you are in Australia, you may also request access to or correction of your personal information under the Privacy Act 1988 and complain to the Office of the Australian Information Commissioner (oaic.gov.au) if we do not resolve your concern. If you are in the UK or EU, you have additional rights under the GDPR, including objection, restriction and portability, and the right to complain to your local data protection authority.</li>
          <li>If a hotel or business wants its public contact details removed from Dapples, email us and we will remove them.</li>
        </ul>

        <h2 style={s.h2}>9. Children</h2>
        <p style={s.p}>Dapples is for people aged 18 and over. We do not knowingly collect information from children.</p>

        <h2 style={s.h2}>10. Changes to this policy</h2>
        <p style={s.p}>We may update this policy as Dapples grows. We will change the date above and, for significant changes, tell you by email or in the app.</p>

        <h2 style={s.h2}>11. Contact</h2>
        <p style={s.p}>Questions, requests or complaints: <a style={s.a} href="mailto:hello@dapples.io">hello@dapples.io</a>.</p>
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
