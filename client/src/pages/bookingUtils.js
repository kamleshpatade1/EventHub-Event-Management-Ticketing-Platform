export const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-[#9f3b27] px-5 py-2.5 text-sm font-semibold text-[#fff4e8] transition-colors hover:bg-[#852f1e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f3b27] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs';

export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-[#d4c7b9] bg-white px-5 py-2.5 text-sm font-semibold text-[#211c18] transition-colors hover:bg-[#faf7f2] hover:border-[#9f3b27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f3b27] disabled:cursor-not-allowed disabled:opacity-60';

export function formatEventDate(value, timezone) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}

export function formatMoney(amountMinor, currency) {
  if (!Number.isFinite(amountMinor) || !currency) return 'Price unavailable';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function getEventDetails(booking) {
  return {
    ...(booking?.eventSnapshot ?? {}),
    ...(booking?.event ?? {}),
    ...(booking?.eventSnapshot ?? {}),
  };
}

export function statusLabel(status) {
  return (
    {
      PENDING_PAYMENT: 'Payment pending',
      CONFIRMED: 'Confirmed',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired',
      REFUND_REQUIRED: 'Review required',
      REFUNDED: 'Refunded',
    }[status] ?? 'Unknown status'
  );
}

export function paymentStateLabel(booking) {
  if (booking.amountMinor === 0) return 'Not required (free booking)';
  return (
    {
      PENDING_PAYMENT: 'Awaiting provider confirmation',
      CONFIRMED: 'Paid and verified',
      CANCELLED: 'Not available',
      EXPIRED: 'Expired',
      REFUND_REQUIRED: 'Review/refund required',
      REFUNDED: 'Refunded',
    }[booking.status] ?? 'Unavailable'
  );
}
