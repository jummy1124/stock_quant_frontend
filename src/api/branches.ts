import { userJson } from "./userClient";
export type BranchTrade = { trade_date:string; branch_code:string; branch_name:string; symbol:string; stock_name:string; buy_amount:number; sell_amount:number; net_amount:number; inventory_cost:number|null; inventory_value:number|null; fetched_at:string };
export type BranchTradesResponse = { branch_code:string; branch_name:string; start:string; end:string; trades:BranchTrade[] };
export function fetchBranchTrades(branchCode:string, start:string, end:string, signal?:AbortSignal) {
  const q = new URLSearchParams({start,end});
  return userJson<BranchTradesResponse>(`/branches/${encodeURIComponent(branchCode)}?${q}`, {signal});
}
