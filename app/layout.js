import "./globals.css";
import { Manrope } from "next/font/google";
import { AuthProvider } from "../lib/auth";
import AuthGuard from "../components/AuthGuard";
import Sidebar from "../components/Sidebar";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "StayFind",
  description: "Hotel content outreach platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={manrope.variable}>
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
