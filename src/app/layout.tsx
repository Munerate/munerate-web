import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "munerate — Finance for intelligence",
  description: "The financial core for physical AI",
  metadataBase: new URL("https://munerate.com"),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "munerate",
    description: "Finance for intelligence.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3E9" },
    { media: "(prefers-color-scheme: dark)", color: "#071220" },
  ],
  colorScheme: "light dark",
};

// Applies the stored theme before first paint so there is no light flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("munerate-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
