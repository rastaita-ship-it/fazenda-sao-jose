import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import AuthGate from "@/components/auth/AuthGate";

export const metadata: Metadata = {
  title: "Fazenda Sao Jose",
  description: "Controle economico e operacional da Fazenda Sao Jose",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Faz. Sao Jose",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#3f8f34",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthGate>
          <main className="mx-auto min-h-screen max-w-md pb-24">{children}</main>
          <BottomNav />
        </AuthGate>
      </body>
    </html>
  );
}
