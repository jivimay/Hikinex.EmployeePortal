import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hikinex.com/portal/"),
  title: "H!KINEX Commons - Employee Hub",
  description: "A community-first H!KINEX Employee Hub connecting people, company updates and work tools.",
  icons: { icon: `${process.env.PORTAL_BASE_PATH || ""}/favicon.svg`, shortcut: `${process.env.PORTAL_BASE_PATH || ""}/favicon.svg` },
  openGraph: { title: "H!KINEX Commons", description: "Your people, company and work in one welcoming employee homebase." },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
