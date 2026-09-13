import { useEffect, useState } from "react";
import { fetchBranchTrades, type BranchTrade } from "../api/branches";
import { useI18n } from "../i18n";

const BRANCH_CODE = "9275";
function today(){ return new Date().toISOString().slice(0,10); }
function money(v:number|null|undefined){ return v == null ? "—" : v.toLocaleString(); }
export function BranchTradesPage(){
  const {t}=useI18n(); const [start,setStart]=useState("2026-08-31"); const [end,setEnd]=useState(today());
  const [rows,setRows]=useState<BranchTrade[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  const load=()=>{setBusy(true);setError(null);fetchBranchTrades(BRANCH_CODE,start,end).then(r=>setRows(r.trades)).catch(e=>setError((e as Error).message)).finally(()=>setBusy(false));};
  useEffect(()=>{load();},[]);
  return <div className="screen-page"><header className="app-header"><div className="app-header__title"><h1>{t("branch.title")}</h1><p className="app-header__subtitle">凱基-三多 · 單位：仟元</p></div></header>
    <main className="screen-page__body branch-body"><section className="bt-controls"><div className="bt-controls__row"><label className="bt-field"><span className="bt-field__label">{t("branch.start")}</span><input className="bt-input bt-input--date" type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="bt-field"><span className="bt-field__label">{t("branch.end")}</span><input className="bt-input bt-input--date" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><button className="bt-btn" onClick={load} disabled={busy}>{busy?t("common.loading"):t("branch.query")}</button></div></section>
    {error&&<p className="alert alert--error">{error}</p>}{!busy&&!error&&<div className="table-wrap"><table className="stock-table branch-table"><thead><tr><th>{t("branch.branch")}</th><th>{t("branch.stock")}</th><th>{t("branch.buy")}</th><th>{t("branch.sell")}</th><th>{t("branch.net")}</th><th>{t("branch.cost")}</th><th>{t("branch.value")}</th></tr></thead><tbody>{rows.map(r=><tr key={`${r.trade_date}-${r.symbol}`}><td data-label={t("branch.branch")}>{r.branch_name}<small>{r.trade_date}</small></td><td data-label={t("branch.stock")}><b>{r.symbol}</b> {r.stock_name}</td><td className="num" data-label={t("branch.buy")}>{money(r.buy_amount)}</td><td className="num" data-label={t("branch.sell")}>{money(r.sell_amount)}</td><td className={`num ${r.net_amount>=0?"up":"down"}`} data-label={t("branch.net")}>{money(r.net_amount)}</td><td className="num" data-label={t("branch.cost")}>{money(r.inventory_cost)}</td><td className="num" data-label={t("branch.value")}>{money(r.inventory_value)}</td></tr>)}</tbody></table></div>}</main><footer className="app-footer">{t("common.notAdvice")}</footer></div>;
}
