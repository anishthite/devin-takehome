const time = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export const formatTime = (iso: string) => `${time.format(new Date(iso))} UTC`;

/** Reduces a form-supplied return path to a same-app path. */
export function safePath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.delete("error");
  url.searchParams.delete("notice");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}
