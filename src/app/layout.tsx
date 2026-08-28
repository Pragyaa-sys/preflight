import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const headingFont = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PreFlight — Check Before You Ship",
  description: "Detect code health, security vulnerabilities, broken builds, and runtime issues before production deployment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-body bg-black text-slate-100 selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}

