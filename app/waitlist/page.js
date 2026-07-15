import Waitlist from "../../components/Waitlist";

export const metadata = {
  title: "Join the Dapples waitlist",
  description: "Dapples is launching soon — join the waitlist for early access.",
};

// Public route — no auth required (see AuthGuard / Sidebar public-path handling).
export default function WaitlistPage() {
  return <Waitlist />;
}
