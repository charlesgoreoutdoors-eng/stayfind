import "./globals.css";

export const metadata = {
  title: "StayFind — Hotel Outreach",
  description: "Find hotels and start your content outreach",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
