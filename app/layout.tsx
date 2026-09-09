import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draftly",
  description: "A page-first writing and publishing prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
