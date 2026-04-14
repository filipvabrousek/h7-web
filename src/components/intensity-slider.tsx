"use client";

import { PerceivedIntensity, intensityMeta } from "@/lib/types";

const INTENSITY_COLORS: Record<PerceivedIntensity, string> = {
  [PerceivedIntensity.CASUAL]: "#9E9E9E",
  [PerceivedIntensity.CONSCIOUS]: "#33B859",
  [PerceivedIntensity.CHALLENGING]: "#FFD700",
  [PerceivedIntensity.VIGOROUS]: "#FF8C00",
  [PerceivedIntensity.MAXIMUM]: "#F44336",
};

export function IntensitySlider({
  value,
  onChange,
}: {
  value: PerceivedIntensity;
  onChange: (v: PerceivedIntensity) => void;
}) {
  const meta = intensityMeta[value];
  const color = INTENSITY_COLORS[value];

  return (
    <div className="bg-gray-50 dark:bg-[#242A2A] rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-base font-bold" style={{ color }}>
          {meta.title}
        </span>
        <span className="text-sm font-semibold text-gray-500">{value}/5</span>
      </div>

      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as PerceivedIntensity)}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          accentColor: color,
          background: `linear-gradient(to right, ${color} ${((value - 1) / 4) * 100}%, ${color}33 ${((value - 1) / 4) * 100}%)`,
        }}
      />

      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map((v) => (
          <span
            key={v}
            className="text-xs"
            style={{
              fontWeight: v === value ? 700 : 400,
              color: v === value ? color : "#9ca3af80",
            }}
          >
            {v}
          </span>
        ))}
      </div>

      <p className="text-sm text-gray-500">{meta.description}</p>

      {meta.badge && (
        <span
          className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-lg"
          style={{
            color:
              value === PerceivedIntensity.CASUAL
                ? "#FF8C00"
                : value === PerceivedIntensity.MAXIMUM
                  ? "#F44336"
                  : value === PerceivedIntensity.VIGOROUS
                    ? "#FF8C00"
                    : "#33B859",
            backgroundColor:
              value === PerceivedIntensity.CASUAL
                ? "#FF8C0020"
                : value === PerceivedIntensity.MAXIMUM
                  ? "#F4433620"
                  : value === PerceivedIntensity.VIGOROUS
                    ? "#FF8C0020"
                    : "#33B85920",
          }}
        >
          {meta.badge}
        </span>
      )}
    </div>
  );
}
