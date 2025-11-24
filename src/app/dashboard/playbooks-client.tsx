
'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Bot, ChevronDown, Search, Sparkles } from 'lucide-react';
import { PlaybookSuggestionDialog } from './components/playbook-suggestion-dialog';
import type { Playbook, PlaybookDraft } from '@/types/domain';
import { Badge } from '@/components/ui/badge';

// This file is no longer used, the functionality has been moved to page.tsx
// for a cleaner server/client component structure.
// This is kept to prevent build errors from imports but will be removed.

export default function DashboardPlaybooksClient() {
    return <div>This component is deprecated.</div>
}


