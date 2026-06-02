import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "StayFind",
  description: "Hotel content outreach platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Sidebar>{children}</Sidebar>
      </body>
    </html>
  );
}
