import { Avatar as AvatarRoot, AvatarFallback } from "@/ui-components/avatar";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <AvatarRoot aria-hidden className={className}>
      <AvatarFallback className="bg-brand-soft text-xs font-semibold text-gain">
        {initials(name)}
      </AvatarFallback>
    </AvatarRoot>
  );
}
