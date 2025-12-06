'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function RoleSwitcher() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleSimulate = (role: string) => {
        // Set cookie for 1 hour
        document.cookie = `x-simulated-role=${role}; path=/; max-age=3600`;

        // Determine redirect path
        let redirectPath = '/dashboard/playbooks'; // Default for brand/dispensary
        if (role === 'customer') {
            redirectPath = '/account';
        }

        // Use window.location.href to ensure a full reload and navigation
        window.location.href = redirectPath;
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                    <Users className="h-4 w-4" />
                    <span className="sr-only">Switch Role</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Simulate Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSimulate('brand')}>
                    Brand
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSimulate('dispensary')}>
                    Dispensary
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSimulate('customer')}>
                    Customer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
