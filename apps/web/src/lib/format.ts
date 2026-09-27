export function formatPrice(amountCents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountCents / 100);
}

export function formatMinutesSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
