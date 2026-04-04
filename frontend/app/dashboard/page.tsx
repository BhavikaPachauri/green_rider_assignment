import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | Earnest Tasks",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
