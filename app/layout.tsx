import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import AuthGate from "@/components/auth/AuthGate";
import RegistrarServiceWorker from "@/components/pwa/RegistrarServiceWorker";
import { ToastProvider } from "@/components/ui/ToastContext";

export const metadata: Metadata = {
  title: "Fazenda Sao Jose",
  description: "Controle economico e operacional da Fazenda Sao Jose",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Faz. Sao Jose",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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
        <ToastProvider>
          <RegistrarServiceWorker />
          <AuthGate>
            <main className="mx-auto min-h-screen max-w-md pb-24">{children}</main>
            <BottomNav />
          </AuthGate>
        </ToastProvider>
      </body>
    </html>
  );
}
