import type { Metadata, Viewport } from "next";
import { RefractionFilter } from "@/components/glass/Glass";
import { TabBar } from "@/components/glass/TabBar";
import { InstallCoach } from "@/components/InstallCoach";
import { OfflineProvider } from "@/components/offline/OfflineProvider";
import splash from "@/lib/splash.json";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RetroGlass", template: "%s · RetroGlass" },
  description: "An offline, open-source retro game emulator with a Liquid Glass interface.",
  applicationName: "RetroGlass",
  appleWebApp: {
    capable: true,
    title: "RetroGlass",
    statusBarStyle: "black-translucent",
    startupImage: splash,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f7" },
    { media: "(prefers-color-scheme: dark)", color: "#05060a" },
  ],
};

// Runs before paint: theme preference + Chromium-only refraction flag.
const bootScript = `try{var t=localStorage.getItem("retroglass:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}
if(/Chrome\\//.test(navigator.userAgent)&&!/Edg\\/|OPR\\//.test(navigator.userAgent)&&!/iPhone|iPad|iPod/.test(navigator.userAgent))document.documentElement.classList.add("is-chromium");`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="antialiased">
        <div className="wallpaper" aria-hidden />
        <RefractionFilter />
        <OfflineProvider>
          {children}
          <TabBar />
          <InstallCoach />
        </OfflineProvider>
      </body>
    </html>
  );
}
