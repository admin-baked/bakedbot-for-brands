import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/app/dashboard/settings/brand-guide/components/archetype-selector', () => ({
  ArchetypeSelector: () => <div data-testid="archetype-selector" />,
}));

jest.mock('@/app/dashboard/settings/brand-guide/components/archetype-preview', () => ({
  ArchetypePreview: () => <div data-testid="archetype-preview" />,
}));

jest.mock('lucide-react', () => ({
  Instagram: () => <span />,
  Facebook: () => <span />,
  MapPin: () => <span />,
  Building2: () => <span />,
  Gem: () => <span />,
  Tag: () => <span />,
  Users: () => <span />,
  HeartPulse: () => <span />,
  Sparkles: () => <span />,
  ShieldAlert: () => <span />,
}));

import { Step3Dialog } from '@/app/dashboard/settings/brand-guide/components/setup-step-dialogs';

describe('Step3Dialog malformed payload handling', () => {
  const onOpenChange = jest.fn();
  const onComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters malformed list payloads and submits only valid strings', async () => {
    render(
      <Step3Dialog
        open={true}
        onOpenChange={onOpenChange}
        onComplete={onComplete}
        initialData={{
          tone: ['professional', 123, ''] as any,
          personality: ['friendly', null] as any,
          doWrite: ['Use inclusive language', 10, ''] as any,
          dontWrite: ['Avoid medical claims', { bad: true }] as any,
        }}
      />
    );

    expect(screen.getByText(/Suggestions pre-selected from your website/i)).toBeInTheDocument();

    const doWriteField = screen.getByLabelText(/Do Write/i) as HTMLTextAreaElement;
    const dontWriteField = screen.getByLabelText(/Don't Write/i) as HTMLTextAreaElement;

    await waitFor(() => {
      expect(doWriteField.value).toBe('Use inclusive language');
      expect(dontWriteField.value).toBe('Avoid medical claims');
    });

    const submitButton = screen.getByRole('button', { name: /Save & Continue/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    expect(onComplete).toHaveBeenCalledWith({
      tone: ['Professional'],
      personality: ['Friendly'],
      doWrite: ['Use inclusive language'],
      dontWrite: ['Avoid medical claims'],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('supports string payloads for tone/personality/doWrite/dontWrite', async () => {
    render(
      <Step3Dialog
        open={true}
        onOpenChange={onOpenChange}
        onComplete={onComplete}
        initialData={{
          tone: 'professional',
          personality: 'friendly',
          doWrite: 'Keep it clear',
          dontWrite: 'No guarantees',
        } as any}
      />
    );

    expect(screen.getByText(/Suggestions pre-selected from your website/i)).toBeInTheDocument();

    const doWriteField = screen.getByLabelText(/Do Write/i) as HTMLTextAreaElement;
    const dontWriteField = screen.getByLabelText(/Don't Write/i) as HTMLTextAreaElement;

    await waitFor(() => {
      expect(doWriteField.value).toBe('Keep it clear');
      expect(dontWriteField.value).toBe('No guarantees');
    });

    const submitButton = screen.getByRole('button', { name: /Save & Continue/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    expect(onComplete).toHaveBeenCalledWith({
      tone: ['Professional'],
      personality: ['Friendly'],
      doWrite: ['Keep it clear'],
      dontWrite: ['No guarantees'],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
