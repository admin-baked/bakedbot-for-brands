'use client';

import React from "react";
import { FFFAuditTool } from "@/components/audit/fff-audit-tool";

export default function DashboardAuditPage() {
    return <FFFAuditTool isInternal={true} showHeader={false} />;
}
