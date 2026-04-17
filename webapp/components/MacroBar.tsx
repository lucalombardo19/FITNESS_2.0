interface Props {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}

export default function MacroBar({ label, value, max, color, unit = 'g' }: Props) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-sub">{label}</span>
        <span className="font-semibold text-white">{Math.round(value)}{unit}</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
