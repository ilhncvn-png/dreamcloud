export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidUsername(value: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(value);
}

export function sanitizeContent(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}
