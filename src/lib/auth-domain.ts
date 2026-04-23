export function matchesAllowedDomain(email: string, domain: string): boolean {
  const normalizedDomain = domain.trim().replace(/^@/, "").toLowerCase();
  if (!normalizedDomain) return false;

  return email.toLowerCase().endsWith(`@${normalizedDomain}`);
}
