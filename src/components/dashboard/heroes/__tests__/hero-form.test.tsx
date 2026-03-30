import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroForm } from '@/components/dashboard/heroes/hero-form';
import { createHero, updateHero } from '@/app/actions/heroes';
import { mirrorBrandAssetFromUrl } from '@/server/actions/brand-assets';

const mockToast = jest.fn();

jest.mock('@/app/actions/heroes', () => ({
  createHero: jest.fn(),
  updateHero: jest.fn(),
}));

jest.mock('@/server/actions/brand-assets', () => ({
  mirrorBrandAssetFromUrl: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
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

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, id }: any) => <div data-testid={id}>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

describe('HeroForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createHero as jest.Mock).mockResolvedValue({ success: true });
    (updateHero as jest.Mock).mockResolvedValue({ success: true });
    (mirrorBrandAssetFromUrl as jest.Mock).mockImplementation(async (_orgId: string, input: { sourceUrl: string }) => ({
      success: true,
      assetUrl: `https://storage.googleapis.com/bakedbot-ai.appspot.com/brands/org_thrive_syracuse/assets/${encodeURIComponent(input.sourceUrl)}`,
    }));
  });

  it('renders Weedmaps fields when the default channel is weedmaps', () => {
    render(
      <HeroForm
        orgId="org_thrive_syracuse"
        defaultChannel="weedmaps"
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Headline')).toBeInTheDocument();
    expect(screen.getByText('Mobile Preset')).toBeInTheDocument();
    expect(screen.queryByText('Stats')).not.toBeInTheDocument();
    expect(screen.queryByText('Secondary Call-to-Action')).not.toBeInTheDocument();
  });

  it('submits a weedmaps payload through createHero', async () => {
    const onSuccess = jest.fn();

    render(
      <HeroForm
        orgId="org_thrive_syracuse"
        defaultChannel="weedmaps"
        onSuccess={onSuccess}
        onCancel={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Brand Name *'), {
      target: { value: 'Thrive Syracuse' },
    });
    fireEvent.change(screen.getByLabelText('Brand Logo URL'), {
      target: { value: 'https://example.com/logo.png' },
    });
    fireEvent.change(screen.getByLabelText('Headline'), {
      target: { value: 'Weekend Deals' },
    });
    fireEvent.change(screen.getByLabelText('Subheadline'), {
      target: { value: 'Fresh drops and bundle pricing' },
    });
    fireEvent.change(screen.getByLabelText('Deal Text'), {
      target: { value: '20% OFF' },
    });
    fireEvent.change(screen.getByLabelText('Bundle Text'), {
      target: { value: '2 for $50' },
    });
    fireEvent.change(screen.getByLabelText('CTA Text'), {
      target: { value: 'Shop Now' },
    });
    fireEvent.change(screen.getByLabelText('Disclaimer Text'), {
      target: { value: '21+ only' },
    });
    fireEvent.change(screen.getByLabelText('License Text'), {
      target: { value: 'LIC-123' },
    });
    fireEvent.change(screen.getByLabelText('Desktop Background Image URL'), {
      target: { value: 'https://example.com/desktop.png' },
    });
    fireEvent.change(screen.getByLabelText('Mobile Background Image URL'), {
      target: { value: 'https://example.com/mobile.png' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create banner/i }));

    await waitFor(() => {
      expect(createHero).toHaveBeenCalledWith(expect.objectContaining({
        orgId: 'org_thrive_syracuse',
        channel: 'weedmaps',
        brandName: 'Thrive Syracuse',
        brandLogo: 'https://storage.googleapis.com/bakedbot-ai.appspot.com/brands/org_thrive_syracuse/assets/https%3A%2F%2Fexample.com%2Flogo.png',
        tagline: 'Weekend Deals',
        description: 'Fresh drops and bundle pricing',
        heroImage: 'https://storage.googleapis.com/bakedbot-ai.appspot.com/brands/org_thrive_syracuse/assets/https%3A%2F%2Fexample.com%2Fdesktop.png',
        primaryCta: {
          label: 'Shop Now',
          action: 'shop_now',
        },
        weedmaps: expect.objectContaining({
          desktopImage: 'https://storage.googleapis.com/bakedbot-ai.appspot.com/brands/org_thrive_syracuse/assets/https%3A%2F%2Fexample.com%2Fdesktop.png',
          mobileImage: 'https://storage.googleapis.com/bakedbot-ai.appspot.com/brands/org_thrive_syracuse/assets/https%3A%2F%2Fexample.com%2Fmobile.png',
          headline: 'Weekend Deals',
          subheadline: 'Fresh drops and bundle pricing',
          dealText: '20% OFF',
          bundleText: '2 for $50',
          ctaText: 'Shop Now',
          disclaimerText: '21+ only',
          licenseText: 'LIC-123',
          mobilePreset: 'documented',
        }),
      }));
    });

    expect(mirrorBrandAssetFromUrl).toHaveBeenCalledTimes(3);
    expect(onSuccess).toHaveBeenCalled();
  });
});
