interface SeverityLevel {
  label: string;
  badgeClass: string;
  dotClass: string;
}

function getSeverityLevel(severity: number): SeverityLevel {
  if (severity <= 0.15)
    return { label: "Normal",           badgeClass: "text-success bg-success/10 border-success/30",         dotClass: "bg-success" };
  if (severity <= 0.45)
    return { label: "Lung Opacity",     badgeClass: "text-warning bg-warning/10 border-warning/30",         dotClass: "bg-warning" };
  if (severity <= 0.75)
    return { label: "Viral Pneumonia",  badgeClass: "text-orange-400 bg-orange-400/10 border-orange-400/30", dotClass: "bg-orange-400" };
  return   { label: "COVID-19",         badgeClass: "text-error bg-error/10 border-error/30",               dotClass: "bg-error" };
}

interface Props {
  severity: number;
  showScore?: boolean;
}

export default function SeverityBadge({ severity, showScore = true }: Props) {
  const level = getSeverityLevel(severity);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${level.badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level.dotClass}`} />
      {level.label}
      {showScore && (
        <span className="font-mono opacity-75 ml-0.5">{severity.toFixed(2)}</span>
      )}
    </span>
  );
}
