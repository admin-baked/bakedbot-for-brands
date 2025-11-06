'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore, type NavLink } from '@/hooks/use-store';
import * as LucideIcons from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditLinkDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  link: NavLink | null; // Null for "add" mode
}

const iconNames = Object.keys(LucideIcons).filter(key => typeof (LucideIcons as any)[key] === 'object');

export default function EditLinkDialog({ isOpen, setIsOpen, link }: EditLinkDialogProps) {
  const { updateNavLink, addNavLink } = useStore();
  const [label, setLabel] = React.useState('');
  const [href, setHref] = React.useState('');
  const [icon, setIcon] = React.useState<keyof typeof LucideIcons>('PanelRight');
  const { toast } = useToast();

  const isAddMode = link === null;

  React.useEffect(() => {
    if (isOpen) {
      if (link) {
        setLabel(link.label);
        setHref(link.href);
        setIcon(link.icon);
      } else {
        // Reset for add mode
        setLabel('');
        setHref('/dashboard/');
        setIcon('PanelRight');
      }
    }
  }, [isOpen, link]);
  
  const handleSave = () => {
    if (!label || !href || !icon) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
      });
      return;
    }

    if (isAddMode) {
        addNavLink({ label, href, icon });
        toast({
            title: 'Link Added',
            description: `The "${label}" link was successfully added.`,
        });
    } else {
        updateNavLink(link.href, { label, href, icon });
        toast({
            title: 'Link Updated',
            description: `The "${link.label}" link was successfully updated.`,
        });
    }

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isAddMode ? 'Add New Link' : 'Edit Link'}</DialogTitle>
          <DialogDescription>
            {isAddMode ? 'Create a new navigation link for the sidebar.' : `Make changes to the "${link?.label}" link. Click save when you\'re done.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="link-label" className="text-right">
              Label
            </Label>
            <Input id="link-label" value={label} onChange={(e) => setLabel(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="link-href" className="text-right">
              Path
            </Label>
            <Input id="link-href" value={href} onChange={(e) => setHref(e.target.value)} className="col-span-3" disabled={!isAddMode} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="link-icon" className="text-right">
              Icon
            </Label>
            <Select value={icon} onValueChange={(value) => setIcon(value as keyof typeof LucideIcons)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                    {iconNames.map(iconName => (
                        <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                                {React.createElement((LucideIcons as any)[iconName], { className: "h-4 w-4"})}
                                <span>{iconName}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
