import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameHub",
  description: "A Scalable Multi-Game Real-Time Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen selection:bg-cyan-500/30">
        {children}
      </body>
    </html>
  );
}
