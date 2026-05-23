interface Props {
  label: string;
  value: number | string;
  best?: boolean;
  unit?: string;
  lowerIsBetter?: boolean;
}

export default function MetricBadge({ label, value, best = false, unit = "", lowerIsBetter = false }: Props) {
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border ${best ? "border-primary/40 bg-primary/5" : "border-border bg-surface"}`}>
      <span className="text-xs text-text-secondary uppercase tracking-wide">{label}</span>
      <span className={`font-mono font-semibold text-sm ${best ? "text-primary" : "text-text-primary"}`}>
        {typeof value === "number" ? value.toFixed(lowerIsBetter ? 0 : 3) : value}
        {unit && <span className="text-text-secondary text-xs ml-0.5">{unit}</span>}
      </span>
      {best && (
        <span className="text-[10px] text-primary font-semibold mt-0.5">BEST</span>
      )}
    </div>
  );
}
