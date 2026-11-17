/**
 * TOTEM USA Stripe / US-PAY-C11 seller-controlled refunds.
 * No payment card data and no client-generated Stripe IDs.
 * We show server-calculated USD balance and require consent for one exact
 * amount. An uncertain outcome retains the SAME UUID and same amount.
 * Hidden by default until both SDK and Backend flags are approved.
 */
import {useEffect,useRef,useState} from "react";
import {getAuthAccessToken} from "../api/internal.js";

const API=String(
  import.meta.env.VITE_API_BASE||
  (typeof window!=="undefined"?window.TOTEM_API_BASE:"")||
  "https://api.totemv.com"
).replace(/\/$/,"");
const ENABLED=import.meta.env.VITE_US_PAY_C11_LIVE_REFUNDS_ENABLED==="true";
function dollars(cents){
  if(!/^\d+$/.test(String(cents||"")))return "—";
  const value=BigInt(cents);
  return "$"+(value/100n).toLocaleString("en-US")+
    "."+String(value%100n).padStart(2,"0");
}
function usdCents(input){
  const s=String(input||"").trim();
  if(!/^(?:[1-9]\d{0,5}|0)\.\d{2}$/.test(s))return null;
  const [whole,minor]=s.split(".");
  const amount=BigInt(whole)*100n+BigInt(minor);
  return amount>0n&&amount<=99999999n?amount:null;
}
function urlFor(ownerType,ownerId,bookingId){
  const owner=Number(ownerId),booking=Number(bookingId);
  if(!["salon","master"].includes(ownerType)||
     !Number.isSafeInteger(owner)||owner<1||
     !Number.isSafeInteger(booking)||booking<1){
    throw Error("US_C11_REFUND_OWNER_OR_BOOKING_INVALID");
  }
  return API+"/internal/us-pay-c11/live-connect/"+ownerType+"/"+owner+
    "/bookings/"+booking+"/refund";
}
async function request({url,method,body,signal}){
  const token=getAuthAccessToken();
  if(!token)throw Error("US_C11_REFUND_LOGIN_REQUIRED");
  const r=await fetch(url,{
    method,signal,cache:"no-store",credentials:"omit",
    headers:{Authorization:"Bearer "+token,Accept:"application/json",
      ...(body?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
  });
  const json=await r.json().catch(()=>null);
  if(!r.ok||json?.ok!==true){
    const err=new Error(String(json?.error||"US_C11_REFUND_UNAVAILABLE"));
    err.status=r.status;
    throw err;
  }
  return json;
}
export default function UsPayC11RefundCard({
  ownerType,ownerId,bookingId,isUsMarket,
}){
  const [quote,setQuote]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [amountText,setAmountText]=useState("");
  const [mode,setMode]=useState("full");
  const [reason,setReason]=useState("requested_by_customer");
  const [approved,setApproved]=useState(false);
  const [working,setWorking]=useState(false);
  const [outcome,setOutcome]=useState(null);
  const requestId=useRef(null);
  const lockedBody=useRef(null);
  const visible=ENABLED&&isUsMarket===true &&
    Number.isSafeInteger(Number(ownerId))&&Number(ownerId)>0 &&
    Number.isSafeInteger(Number(bookingId))&&Number(bookingId)>0;
  const endpoint=visible?urlFor(ownerType,ownerId,bookingId):"";

  useEffect(()=>{
    if(!visible)return undefined;
    let live=true;
    const abort=new AbortController();
    setLoading(true);setQuote(null);setOutcome(null);setError("");
    setApproved(false);requestId.current=null;lockedBody.current=null;
    request({url:endpoint+"/quote",method:"GET",signal:abort.signal})
      .then(data=>{
        if(!live)return;
        if(data.contract_version!=="US-PAY-C11-refund-quote-v1"||
           data.market_code!=="US"||data.currency_code!=="USD"||
           data.booking_id!==Number(bookingId)) {
          throw Error("US_C11_REFUND_QUOTE_CONTRACT_MISMATCH");
        }
        setQuote(data);
        const n=BigInt(data.remaining_minor);
        setAmountText(dollars(n.toString()).replace(/[$,]/g,""));
      })
      .catch(e=>{
        if(live&&!abort.signal.aborted)
          setError(String(e.message||"US_C11_REFUND_QUOTE_UNAVAILABLE"));
      })
      .finally(()=>{if(live)setLoading(false)});
    return ()=>{live=false;abort.abort();};
  },[visible,endpoint,bookingId]);

  if(!visible)return null;
  const current=usdCents(amountText);
  const remaining=quote?.remaining_minor?BigInt(quote.remaining_minor):0n;
  const amount=mode==="full"?remaining:current;
  const payable=quote?.refundable===true&&
    remaining>0n&&amount!==null&&amount>0n&&amount<=remaining;
  const canSubmit=!working&&!loading&&payable&&approved&&!error&&!outcome;
  async function submit(){
    if(!canSubmit && !lockedBody.current)return;
    if(!lockedBody.current){
      if(!window.confirm(
        "Подтвердите реальный возврат "+dollars(amount.toString())+
        " клиенту. Операция изменяет баланс вашего Stripe-аккаунта. Продолжить?"
      ))return;
      const id=window.crypto.randomUUID();
      requestId.current=id;
      lockedBody.current={
        request_id:id,amount_minor:amount.toString(),
        expected_remaining_minor:remaining.toString(),
        reason,consent:true,
      };
    }
    setWorking(true);setError("");
    try{
      const data=await request({
        url:endpoint,method:"POST",body:lockedBody.current,
      });
      if(data?.request_id!==requestId.current){
        throw Error("US_C11_REFUND_RESPONSE_REQUEST_MISMATCH");
      }
      setOutcome(data);
      setApproved(false);
    }catch(e){
      setError(String(e?.message||"US_C11_REFUND_OUTCOME_UNCERTAIN"));
      // CRITICAL: same UUID, amount, seller and reason on ANY retry.
      // Never allow a new request ID on an uncertain Stripe outcome.
    }finally{setWorking(false);}
  }
  return (
    <section aria-label="Stripe refund authorization" style={{
      marginTop:18,padding:16,border:"1px solid #cbd5e1",
      background:"#f8fafc",borderRadius:10,display:"grid",gap:10,
    }}>
      <h3 style={{margin:0,fontSize:18}}>Stripe USA — возврат клиенту</h3>
      {loading?<p role="status">Проверяем сумму по Stripe и TOTEM…</p>:null}
      {quote?(
        <>
          <p style={{margin:0}}>Оплачено: <strong>{dollars(quote.paid_amount_minor)}</strong>.
            {" "}Доступно к возврату: <strong>{dollars(quote.remaining_minor)}</strong>.</p>
          {quote.outstanding_request||quote.dispute_block?
            <p role="alert">Возврат заблокирован: предыдущая операция
              или спор ещё не разрешены.</p>:null}
          {quote.refundable&&!outcome&&!lockedBody.current?(
            <>
              <label><input type="radio" checked={mode==="full"}
                onChange={()=>{setMode("full");setApproved(false);}} />
                {" "}Полный возврат оставшейся суммы</label>
              <label><input type="radio" checked={mode==="partial"}
                onChange={()=>{setMode("partial");setApproved(false);}} />
                {" "}Частичный возврат</label>
              {mode==="partial"?(
                <label style={{display:"grid",gap:5}}>
                  Сумма в USD (например 12.05)
                  <input aria-label="USD refund amount" value={amountText}
                    onChange={e=>{setAmountText(e.target.value);
                      setApproved(false);}}
                    style={{padding:10,maxWidth:210}} />
                </label>
              ):null}
              <label style={{display:"grid",gap:5}}>
                Основание возврата
                <select value={reason} onChange={e=>{
                  setReason(e.target.value);setApproved(false);
                }} style={{minHeight:44,maxWidth:340}}>
                  <option value="requested_by_customer">По запросу клиента</option>
                  <option value="duplicate">Дублирование платежа</option>
                  <option value="fraudulent">Мошенничество (Stripe может заблокировать карту)</option>
                </select>
              </label>
              <label style={{display:"flex",gap:8,alignItems:"start"}}>
                <input type="checkbox" checked={approved}
                  onChange={e=>setApproved(e.target.checked)} />
                <span>Я уполномочен управлять этим Stripe-продавцом и лично
                  разрешаю возврат <strong>{amount?
                    dollars(amount.toString()):"—"}</strong>.</span>
              </label>
            </>
          ):null}
        </>
      ):null}
      {outcome?(
        <p role="status">
          Заявка: {outcome.state}. Возврат окончательно подтверждается только
          подписанным событием Stripe. Не создавайте повторную заявку.
        </p>
      ):null}
      {error?<p role="alert" style={{color:"#991b1b"}}>{error}</p>:null}
      {(canSubmit||lockedBody.current&&!outcome)?(
        <button type="button" onClick={submit} disabled={working}
          style={{padding:"12px 16px",maxWidth:400,minHeight:44,
            border:0,borderRadius:8,background:"#111827",color:"#fff"}}>
          {working?"Подтверждаем в Stripe…":
            lockedBody.current?"Проверить ту же заявку (без нового списания)":
              "Авторизовать возврат в Stripe"}
        </button>
      ):null}
      <p style={{margin:0,fontSize:12,color:"#64748b"}}>
        Данные карты не хранятся в TOTEM. При неизвестном результате
        сохраняется исходный ID запроса; новый возврат не создаётся.
      </p>
    </section>
  );
}
