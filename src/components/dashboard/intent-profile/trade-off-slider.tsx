'use client';
// src/components/dashboard/intent-profile/trade-off-slider.tsx

import { Slider } from '@/components/ui/slider';

interface TradeOffSliderProps {
  label: string;
  leftPoleLabel: string;
  rightPoleLabel: string;
  leftPoleDescription: string;
  rightPoleDescription: string;
  value: number;       // 0.0–1.0
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function TradeOffSlider({
  label,
  leftPoleLabel,
  rightPoleLabel,
  leftPoleDescription,
  rightPoleDescription,
  value,
  onChange,
  disabled = false,
}: TradeOffSliderProps) {
  const pct = Math.round(value * 100);
  const activeDescription = value <= 0.5 ? leftPoleDescription : rightPoleDescription;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>

      <Slider
        min={0}
        max={100}
        step={5}
        value={[pct]}
        onValueChange={([v]) => onChange(v / 100)}
        disabled={disabled}
        className="w-full"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span className={value < 0.5 ? 'font-medium text-primary' : ''}>{leftPoleLabel}</span>
        <span className={value > 0.5 ? 'font-medium text-primary' : ''}>{rightPoleLabel}</span>
      </div>

      <p className="text-xs text-muted-foreground italic">{activeDescription}</p>
    </div>
  );
}
