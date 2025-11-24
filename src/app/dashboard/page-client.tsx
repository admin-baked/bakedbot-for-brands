
"use client";

import * as React from "react";
import type { Playbook } from '@/types/domain';
import { DashboardPlaybooksClient } from './playbooks-client';

type DashboardPageClientProps = {
  initialPlaybooks?: Playbook[];
};

export default function DashboardPageComponent({
  initialPlaybooks,
}: DashboardPageClientProps) {
  // The main dashboard now renders the playbooks client.
  return (
    <DashboardPlaybooksClient initialPlaybooks={initialPlaybooks || []} />
  );
}
