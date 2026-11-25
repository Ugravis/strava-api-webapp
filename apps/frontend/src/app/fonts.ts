import { Barlow, Geist, Geist_Mono, Noto_Sans } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Only the wordmark uses it, so a single weight and style is loaded. */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: "800",
  style: "italic",
});

/** The font of the names on the map, for the bubble of the station shown drawn over it: loaded once used. */
const notoSans = Noto_Sans({
  variable: "--font-map",
  subsets: ["latin"],
  weight: "700",
  preload: false,
});

/** Classes of the root element, shared by the root layout and the global error page, which replaces it. */
export const fontVariables = `${geistSans.variable} ${geistMono.variable} ${barlow.variable} ${notoSans.variable}`;
