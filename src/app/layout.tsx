import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavBar } from "@/components/ui/NavBar";
import { ToastProvider } from "@/lib/ToastContext";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents iOS input zoom
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Antigravity Architect",
  description: "Intelligent offline-first fitness programming",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Antigravity"
  },
  formatDetection: {
    telephone: false
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div style={{ paddingBottom: '80px' }}>
            {children}
          </div>
          <NavBar />
        </ToastProvider>
      </body>
    </html>
  );
}
