import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "StudyBuddy AI",
  description: "AI-powered study companion for Physics, Chemistry, Biology, Math, and Computer Science",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} antialiased bg-bg-base text-text-primary min-h-screen`}>
        <div className="page-glow" />
        <div className="flex h-screen overflow-hidden relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
