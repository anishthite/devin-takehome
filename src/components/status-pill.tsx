const TONES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  kit: "bg-zinc-900 text-white ring-zinc-900",
  dataverse: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function StatusPill({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${TONES[value] ?? TONES.cancelled}`}>
      {label ?? value}
    </span>
  );
}
