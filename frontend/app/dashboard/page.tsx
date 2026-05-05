import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | Green Rider Tasks",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
