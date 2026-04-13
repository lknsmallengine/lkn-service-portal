import { EstimateBreakdown, EstimateLineItem } from "./types";

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateEstimateBreakdown(items: EstimateLineItem[], taxRate = 0.0725): EstimateBreakdown {
  const subtotal = items.filter((item) => item.line_type === 'labor' || item.line_type === 'part').reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const fees = items.filter((item) => item.line_type === 'fee').reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const discounts = items.filter((item) => item.line_type === 'discount').reduce((sum, item) => sum + Math.abs(Number(item.total_price || 0)), 0);
  const taxable = Math.max(0, subtotal + fees - discounts);
  const tax = roundCurrency(taxable * taxRate);
  const total = roundCurrency(taxable + tax);
  return {
    subtotal: roundCurrency(subtotal),
    fees: roundCurrency(fees),
    discounts: roundCurrency(discounts),
    taxable: roundCurrency(taxable),
    tax,
    total
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}
