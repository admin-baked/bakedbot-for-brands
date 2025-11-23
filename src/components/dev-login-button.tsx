
// src/components/dev-login-button.tsx
'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { signInWithCustomToken } from 'firebase/auth';
import { createDevLoginToken } from '@/app/actions/dev-login';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { devPersonas, DEV_PERSONA_OPTIONS, type DevPersonaKey } from '@/lib/dev-personas';
import { Briefcase, Building, Loader2, User, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DEMO_BRAND_ID } from '@/lib/config';

const personaIcons: Record<string, React.ElementType> = {
  brand: Briefcase,
  dispensary: Building,
  customer: User,
  onboarding: UserPlus,
  owner: User,
};

export default function DevLoginButton() {
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  // This component should not render anything in a production environment.
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleDevLogin = async (persona: DevPersonaKey) => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Firebase not initialized.' });
      return;
    }
    setIsSubmitting(persona);
    try {
      const result = await createDevLoginToken(persona);
      if ('error' in result) {
        throw new Error(result.error);
      }
      await signInWithCustomToken(auth, result.token);
      toast({ title: 'Dev Login Success!', description: `Logged in as ${devPersonas[persona].displayName}.` });
      
      // Determine redirection based on persona
      if (persona === 'onboarding') {
        router.push('/onboarding');
      } else if (persona === 'customer') {
        router.push('/');
      } else {
        router.push('/dashboard');
      }

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Dev Login Failed', description: error.message });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full" data-testid="dev-login-button">
          Dev Login
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Persona</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEV_PERSONA_OPTIONS.map(({ key, label, email }) => {
            const Icon = personaIcons[key] || User;
            const isCurrent = isSubmitting === key;
            return (
              <DropdownMenuItem 
                key={key} 
                onClick={() => handleDevLogin(key)} 
                disabled={!!isSubmitting}
                data-testid={`dev-login-item-${email}`}
              >
                {isCurrent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
                <span>{label}</span>
              </DropdownMenuItem>
            )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
