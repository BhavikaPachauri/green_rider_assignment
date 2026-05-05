import type { Metadata } from "next";
import AppProviders from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earnest Projects",
  description:
    "Project and task tracker with role-based access, assignment, status, and overdue alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
