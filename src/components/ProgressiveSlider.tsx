import React from 'react';

interface ProgressiveSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  precision?: number;
  onChange: (value: number) => void;
  subLabel?: string;
}

export const ProgressiveSlider: React.FC<ProgressiveSliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  precision = 1,
  onChange,
  subLabel,
}) => {
  const clamped = Math.min(max, Math.max(min, value));
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-900 leading-snug">
          {label}
        </label>
        <div className="font-mono-tabular text-sm font-bold text-emerald-700 whitespace-nowrap shrink-0">
          {clamped.toFixed(precision)}
          <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>
        </div>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="progressive-emerald-slider w-full"
        style={{
          background: `linear-gradient(to right, #059669 0%, #059669 ${pct}%, #d1fae5 ${pct}%, #d1fae5 100%)`,
        }}
      />

      <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500">
        <span>
          {min}
          {unit}
        </span>
        {subLabel && <span className="font-sans text-slate-600 truncate px-2">{subLabel}</span>}
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
};
