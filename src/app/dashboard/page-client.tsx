
"use client";

import * as React from "react";
import type { Playbook } from '@/types/domain';
import DashboardWelcome from "@/components/dashboard/dashboard-welcome";

type DashboardPageClientProps = {
  initialPlaybooks?: Playbook[];
};

export default function DashboardPageComponent({
  initialPlaybooks: playbooks,
}: DashboardPageClientProps) {
  // For now, this component will just render a welcome message.
  // The playbook logic will be re-integrated into its own dedicated page.
  return (
    <DashboardWelcome />
  );
}
