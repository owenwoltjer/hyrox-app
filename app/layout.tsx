import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HYROX Coach",
  description: "Your personal HYROX training log and AI coach",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HYROX Coach",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-brand-dark text-brand-text antialiased">
        {/* Safe-area wrapper — keeps content above iOS home indicator */}
        <div className="flex flex-col min-h-screen max-w-md mx-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
