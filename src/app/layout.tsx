import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const interPreview = localFont({
  display: "swap",
  src: "../lib/generation/font-assets/inter.ttf",
  variable: "--font-preview-inter",
});

const instrumentSerifPreview = localFont({
  display: "swap",
  src: "../lib/generation/font-assets/instrument-serif.ttf",
  variable: "--font-preview-instrument-serif",
});

const jetbrainsMonoPreview = localFont({
  display: "swap",
  src: "../lib/generation/font-assets/jetbrains-mono.ttf",
  variable: "--font-preview-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Master Asset Studio",
  description: "Master Asset Studio portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${interPreview.variable} ${instrumentSerifPreview.variable} ${jetbrainsMonoPreview.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
