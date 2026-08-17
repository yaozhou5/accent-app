// Single source of truth for the (not-yet-billed) Accent Pro price. No
// Stripe integration exists yet — this is display-only. Change the amount
// or currency here and every mention across the app follows; nothing else
// should hardcode a price string.
export const PRO_PRICE_EUR = 19;
export const PRO_PRICE_SHORT = `€${PRO_PRICE_EUR}/mo`;
export const PRO_PRICE_LONG = `€${PRO_PRICE_EUR}/month`;
