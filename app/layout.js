import "./globals.css";
import { Quicksand, Nunito_Sans } from "next/font/google";
import { AuthProvider } from "../lib/auth";
import AuthGuard from "../components/AuthGuard";
import Sidebar from "../components/Sidebar";

// Dapples brand type: Quicksand (display) + Nunito Sans (body).
// Exposed as CSS vars that globals.css maps to --font-display / --font-body.
const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata = {
  title: "Dapples",
  description: "The outreach workspace to land hotel collabs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${quicksand.variable} ${nunito.variable}`}>
      <body>
        <AuthProvider>
          <AuthGuard>
            <Sidebar>{children}</Sidebar>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
