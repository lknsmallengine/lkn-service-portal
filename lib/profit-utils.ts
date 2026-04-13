import { calculateEstimateBreakdown } from "./estimate-utils";
import { EstimateLineItem, RequestProfitRow, ServiceRequest } from "./types";

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function inferCost(item: EstimateLineItem) {
  if (typeof item.total_cost === "number") return Number(item.total_cost || 0);
  if (item.line_type === "labor") return roundCurrency(Number(item.total_price || 0) * 0.5);
  if (item.line_type === "part") return roundCurrency(Number(item.total_price || 0) * 0.6);
  if (item.line_type === "fee") return roundCurrency(Number(item.total_price || 0) * 0.2);
  return 0;
}

export function buildRequestProfitRows(requests: ServiceRequest[], items: EstimateLineItem[]): RequestProfitRow[] {
  return requests.map((request) => {
    const requestItems = items.filter((item) => item.request_id === request.id);
    const breakdown = calculateEstimateBreakdown(requestItems);
    const laborRevenue = requestItems.filter((item) => item.line_type === "labor").reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const partsRevenue = requestItems.filter((item) => item.line_type === "part").reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const fees = requestItems.filter((item) => item.line_type === "fee").reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const discounts = requestItems.filter((item) => item.line_type === "discount").reduce((sum, item) => sum + Math.abs(Number(item.total_price || 0)), 0);
    const laborCost = requestItems.filter((item) => item.line_type === "labor").reduce((sum, item) => sum + inferCost(item), 0);
    const partsCost = requestItems.filter((item) => item.line_type === "part").reduce((sum, item) => sum + inferCost(item), 0);
    const totalCost = requestItems.reduce((sum, item) => sum + inferCost(item), 0);
    const totalRevenue = breakdown.total;
    const grossProfit = roundCurrency(totalRevenue - totalCost);
    const laborMargin = roundCurrency(laborRevenue - laborCost);
    const partsMargin = roundCurrency(partsRevenue - partsCost);
    const grossMarginPercent = totalRevenue > 0 ? roundCurrency((grossProfit / totalRevenue) * 100) : 0;

    return {
      request_id: request.id,
      request_number: request.request_number,
      equipment_name: request.equipment_name,
      labor_revenue: roundCurrency(laborRevenue),
      labor_cost: roundCurrency(laborCost),
      labor_margin: laborMargin,
      parts_revenue: roundCurrency(partsRevenue),
      parts_cost: roundCurrency(partsCost),
      parts_margin: partsMargin,
      fees: roundCurrency(fees),
      discounts: roundCurrency(discounts),
      tax: roundCurrency(breakdown.tax),
      total_revenue: roundCurrency(totalRevenue),
      total_cost: roundCurrency(totalCost),
      gross_profit: grossProfit,
      gross_margin_percent: grossMarginPercent
    };
  }).sort((a, b) => b.gross_profit - a.gross_profit);
}
