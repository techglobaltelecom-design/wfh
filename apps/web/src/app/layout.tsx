import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { ensureSchedulerStarted } from "@/server/jobs/scheduler";

export const metadata: Metadata = {
  title: "WFH Employee Management System",
  description: "Work from home tracking, monitoring, and payroll."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  ensureSchedulerStarted();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
