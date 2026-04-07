import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "./(shared)/providers/SocketProvider";
import UserProfile from "./(shared)/components/ui/UserProfile";
import ThemeController from "./(shared)/components/layout/ThemeController";

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
        <SocketProvider>
          <ThemeController />
          <div className="bg-atmosphere" />
          {children}
          <UserProfile />
        </SocketProvider>
      </body>
    </html>
  );
}
