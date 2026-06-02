import "./globals.css";
import { AuthProvider } from "../lib/auth";
import AuthGuard from "../components/AuthGuard";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "StayFind",
  description: "Hotel content outreach platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
