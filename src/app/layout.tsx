import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "StudyBuddy AI - CBSE Class 12",
  description: "AI-powered study companion for CBSE Class 12 board exam preparation",
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
        <div className="flex min-h-screen relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
