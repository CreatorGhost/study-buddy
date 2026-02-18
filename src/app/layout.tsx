import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-bg-base text-text-primary min-h-screen">
        <div className="page-glow" />
        <div className="flex min-h-screen relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
