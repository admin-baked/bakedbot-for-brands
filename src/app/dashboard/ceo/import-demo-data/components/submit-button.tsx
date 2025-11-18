
'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Database, Loader2, type LucideIcon } from 'lucide-react';

interface SubmitButtonProps extends ButtonProps {
  label: string;
  icon?: LucideIcon;
}

export function SubmitButton({ label, icon, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const Icon = icon || Database;

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? <Loader2 className="mr-2 animate-spin" /> : <Icon className="mr-2" />}
      {label}
    </Button>
  );
}
