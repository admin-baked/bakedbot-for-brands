'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/billing/upgrade-modal';
import type { TierId } from '@/config/tiers';

interface UpgradeButtonProps {
  orgId: string;
  currentTierId: TierId;
}

export function UpgradeButton({ orgId, currentTierId }: UpgradeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        Upgrade Plan
      </Button>
      <UpgradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgId={orgId}
        currentTierId={currentTierId}
      />
    </>
  );
}
