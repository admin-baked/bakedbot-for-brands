import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreativeCommandCenter from '@/app/dashboard/creative/page';
import { useCreativeContent } from '@/hooks/use-creative-content';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { getMenuData } from '@/app/dashboard/menu/actions';
import { generateMarketingVideo } from '@/ai/flows/generate-video';
import { getBrandKitImages } from '@/server/actions/brand-images';
import { getMyAIStudioUsageSummary } from '@/server/actions/ai-studio';
import { sendCreativeToInbox } from '@/server/actions/creative-inbox';
import { useBrandGuide, useBrandVoice, useBrandColors } from '@/hooks/use-brand-guide';

jest.mock('@/hooks/use-creative-content');
jest.mock('@/firebase/auth/use-user');
jest.mock('next/navigation');
jest.mock('@/app/dashboard/menu/actions');
jest.mock('@/ai/flows/generate-video');
jest.mock('@/server/actions/brand-images');
jest.mock('@/server/actions/ai-studio');
jest.mock('@/server/actions/creative-inbox');
jest.mock('@/hooks/use-brand-guide');
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/lib/config/pricing', () => ({
  findPricingPlan: jest.fn().mockReturnValue({ name: 'Optimize' }),
}));
jest.mock('@/components/creative/engagement-analytics', () => ({
  EngagementAnalytics: () => <div data-testid="engagement-analytics" />,
}));
jest.mock('@/app/dashboard/creative/components/creative-chat-panel', () => ({
  CreativeChatPanel: () => <div data-testid="creative-chat-panel" />,
}));
jest.mock('@/app/dashboard/creative/components/deebo-compliance-panel', () => ({
  DeeboCompliancePanel: () => <div data-testid="deebo-compliance-panel" />,
}));
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/separator', () => ({
  Separator: () => <div data-testid="separator" />,
}));
jest.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock('@/components/ui/select', () => {
  const ReactLocal = require('react') as typeof React;
  const SelectContext = ReactLocal.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
  }>({});

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    SelectItem: ({
      value,
      children,
      className,
    }: {
      value: string;
      children: React.ReactNode;
      className?: string;
    }) => {
      const context = ReactLocal.useContext(SelectContext);
      return (
        <button
          type="button"
          className={className}
          onClick={() => context.onValueChange?.(value)}
        >
          {children}
        </button>
      );
    },
  };
});
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGenerate = jest.fn();
const mockGenerateMarketingVideo = generateMarketingVideo as jest.Mock;

function renderCreativeCenter() {
  return render(<CreativeCommandCenter />);
}

describe('CreativeCommandCenter regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useCreativeContent as jest.Mock).mockReturnValue({
      content: [],
      loading: false,
      error: null,
      generate: mockGenerate,
      approve: jest.fn(),
      revise: jest.fn(),
      editCaption: jest.fn(),
      remove: jest.fn(),
      refresh: jest.fn(),
      isGenerating: false,
      isApproving: null,
    });

    (useUser as jest.Mock).mockReturnValue({
      user: {
        uid: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'admin',
        orgId: 'org_thrive_syracuse',
        brandId: 'org_thrive_syracuse',
      },
      loading: false,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    (getMenuData as jest.Mock).mockResolvedValue({
      products: [
        {
          id: 'p1',
          name: 'Ayrloom - Gummies 10pk - 2:1 Sunny Days - 100mg',
          brandName: 'Ayrloom',
          imageUrl: 'https://example.com/ayrloom-sunny-days.png',
        },
      ],
    });

    (useBrandGuide as jest.Mock).mockReturnValue({
      brandGuide: {
        brandName: 'Thrive Syracuse',
        messaging: {
          tagline: 'Your daily dose of sunshine',
        },
        visualIdentity: {
          logo: {
            primary: 'https://example.com/thrive-logo.png',
          },
        },
      },
      loading: false,
    });

    (useBrandVoice as jest.Mock).mockReturnValue({
      tone: 'Bright and helpful',
      personality: ['friendly'],
      doWrite: ['Keep it concise'],
      dontWrite: ['Make medical claims'],
    });

    (useBrandColors as jest.Mock).mockReturnValue({
      primary: '#2E7D32',
      secondary: '#14532d',
      accent: '#F59E0B',
    });

    (getBrandKitImages as jest.Mock).mockResolvedValue([]);
    (getMyAIStudioUsageSummary as jest.Mock).mockResolvedValue({
      planId: 'optimize',
      totalCreditsAvailable: 7500,
      totalCreditsUsed: 0,
      automationCreditsAvailable: 2000,
      automationCreditsUsed: 0,
      allowShortVideo: true,
      allowFullVideo: true,
    });
    (sendCreativeToInbox as jest.Mock).mockResolvedValue({ success: false });

    mockGenerate.mockResolvedValue({
      id: 'content-1',
      platform: 'instagram',
      status: 'pending',
      caption: 'Discover your daily dose of sunshine.',
      mediaUrls: ['https://example.com/branded-image.png'],
    });

    mockGenerateMarketingVideo.mockResolvedValue({
      videoUrl: 'https://example.com/slideshow.mp4',
      duration: 5,
      provider: 'remotion',
      model: 'BrandedSlideshow-1x1',
    });
  });

  it('passes the selected product and image into branded generation', async () => {
    renderCreativeCenter();

    fireEvent.change(screen.getByPlaceholderText(/Describe your campaign idea/i), {
      target: { value: 'Lets create an image post featuring one of our Products. Use our brand colors.' },
    });

    await screen.findByRole('button', {
      name: /Ayrloom - Gummies 10pk - 2:1 Sunny Days - 100mg/i,
    });

    fireEvent.click(screen.getByRole('button', {
      name: /Ayrloom - Gummies 10pk - 2:1 Sunny Days - 100mg/i,
    }));
    fireEvent.click(screen.getByRole('button', { name: /Branded/i }));
    fireEvent.click(screen.getByRole('button', { name: /Generate with Craig/i }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        imageMode: 'branded',
        productName: 'Ayrloom - Gummies 10pk - 2:1 Sunny Days - 100mg',
        productImageUrl: 'https://example.com/ayrloom-sunny-days.png',
        bgColor: '#2E7D32',
        accentColor: '#F59E0B',
        brandName: 'Thrive Syracuse',
      }),
    );
  });

  it('renders a slideshow preview and forwards the selected product into Remotion', async () => {
    renderCreativeCenter();

    fireEvent.change(screen.getByPlaceholderText(/Describe your campaign idea/i), {
      target: { value: 'Feature our Sunny Days gummies with brand colors.' },
    });

    await screen.findByRole('button', {
      name: /Ayrloom - Gummies 10pk - 2:1 Sunny Days - 100mg/i,
    });

    fireEvent.click(screen.getByRole('button', {
      name: /Ayrloom - Gummies 10pk - 2:1 Sunny Days - 100mg/i,
    }));
    fireEvent.click(screen.getByRole('button', { name: /Slides/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Generate Slideshow/i })[0]);

    await waitFor(() => expect(mockGenerateMarketingVideo).toHaveBeenCalled());

    expect(mockGenerateMarketingVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        aspectRatio: '1:1',
        brandName: 'Thrive Syracuse',
        headline: 'Ayrloom - Gummies 10pk - 2:1 Sunny Days - 100mg',
        productImageUrl: 'https://example.com/ayrloom-sunny-days.png',
        ctaText: 'Shop Now',
        primaryColor: '#2E7D32',
        secondaryColor: '#14532d',
        accentColor: '#F59E0B',
      }),
      expect.objectContaining({
        forceProvider: 'remotion',
      }),
    );

    await waitFor(() => {
      const video = document.querySelector('video');
      expect(video).not.toBeNull();
      expect(video?.getAttribute('src')).toContain('https://example.com/slideshow.mp4');
    });
  });
});
