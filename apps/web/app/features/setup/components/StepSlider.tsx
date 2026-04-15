import React from "react";

interface StepSliderProps {
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label: string;
  formatter?: (value: number) => string;
}

export default function StepSlider({
  options,
  value,
  onChange,
  disabled = false,
  label,
  formatter = (v) => v.toString(),
}: StepSliderProps) {
  const currentIndex = options.indexOf(value as any);
  // Boundary Test Resilience: fallback to 0 if value is not in options
  const safeIndex = currentIndex !== -1 ? currentIndex : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextIndex = parseInt(e.target.value, 10);
    const nextValue = options[nextIndex];
    if (nextValue !== undefined) {
      onChange(nextValue);
    }
  };

  const currentValueText = formatter((options[safeIndex] ?? options[0]) as number);

  return (
    <div className="px-2">
      <input
        type="range"
        min="0"
        max={options.length - 1}
        step="1"
        value={safeIndex}
        disabled={disabled}
        onChange={handleChange}
        aria-label={label}
        aria-valuetext={currentValueText}
        className="w-full accent-white bg-[#333333] h-1 rounded-lg outline-none appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      />
      <div className="flex justify-between text-[10px] text-[var(--muted)] mt-2 font-iosevka-bold">
        <span>{formatter(options[0] as number)}</span>
        <span>{formatter(options[options.length - 1] as number)}</span>
      </div>
    </div>
  );
}
