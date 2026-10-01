function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 ${className}`}
    >
      {initials(name)}
    </span>
  );
}
