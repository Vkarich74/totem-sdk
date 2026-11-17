// TOTEM USA — authorized LIVE Stripe direct-charge Payment Element.
// No card data is processed/stored by TOTEM. Stripe.js is loaded ONLY from
// https://js.stripe.com/v3/. OFF until explicitly enabled at both SDK+API.
// Never infer "paid" from browser success/redirect: signed API readback only.
import { useEffect,useRef,useState } from "react";
import { getUsPayC11Detail,formatUsPayC11Cents } from "./usPayC11Model.js";

const URL_STRIPE_JS="https://js.stripe.com/v3/";
const RETURN_URL="https://app.totemv.com/#/client-payment-return";
const API_BASE=String(
  import.meta.env.VITE_API_BASE||
  (typeof window!=="undefined"?window.TOTEM_API_BASE:"")||
  "https://api.totemv.com"
).replace(/\/$/,"");
let stripeLoader=null;

async function loadStripeJs() {
  if(typeof window==="undefined") throw new Error("STRIPE_BROWSER_REQUIRED");
  if(typeof window.Stripe==="function")return window.Stripe;
  if(stripeLoader)return stripeLoader;
  stripeLoader=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=URL_STRIPE_JS;
    script.async=true;
    script.crossOrigin="anonymous";
    script.onload=()=>{
      if(typeof window.Stripe==="function")resolve(window.Stripe);
      else reject(new Error("STRIPE_JS_UNAVAILABLE"));
    };
    script.onerror=()=>reject(new Error("STRIPE_JS_LOAD_FAILED"));
    document.head.appendChild(script);
  }).catch(error=>{stripeLoader=null;throw error;});
  return stripeLoader;
}

function checkSdkContract(body,bookingId,expectedMinor) {
  const id=Number(bookingId);
  if(body?.ok!==true ||
     body.contract_version!=="US-PAY-C11-live-direct-v1" ||
     body.market_code!=="US" || body.currency_code!=="USD" ||
     body.stripe_mode!=="LIVE" ||
     body.payment_ready!==false ||
     body.booking_id!==id ||
     String(body.amount_minor)!==String(expectedMinor) ||
     body.amount_source!=="us_booking_service_tax_snapshots" ||
     !/^pk_live_[A-Za-z0-9_]+$/.test(String(body.stripe_publishable_key||"")) ||
     !/^acct_[A-Za-z0-9]{8,}$/.test(String(body.stripe_account_id||"")) ||
     !/^pi_[A-Za-z0-9_]{8,}_secret_[A-Za-z0-9_]+$/.test(
       String(body.payment_intent_client_secret||""))) {
    throw new Error("US_C11_PAYMENT_RESPONSE_CONTRACT_MISMATCH");
  }
  return body;
}

export default function UsPayC11LivePaymentCard({
  clientId,token,booking,onRefresh,
}) {
  const [phase,setPhase]=useState("idle");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [checkout,setCheckout]=useState(null);
  const paymentContainer=useRef(null);
  const stripeInstance=useRef(null);
  const elementsInstance=useRef(null);
  const paymentElement=useRef(null);

  const detail=getUsPayC11Detail(booking);
  const isAvailable=import.meta.env.VITE_US_PAY_C11_LIVE_PAYMENTS_ENABLED==="true";
  const eligible=isAvailable && detail?.market_code==="US" &&
    detail?.price?.currency_code==="USD" &&
    detail?.breakdown?.currency_code==="USD" &&
    detail?.breakdown?.source==="us_booking_service_tax_snapshots" &&
    typeof detail?.breakdown?.charge_total_minor==="string" &&
    detail?.collector?.verified===true &&
    ["reserved","confirmed"].includes(detail.booking_status) &&
    !["paid","partially_refunded","refunded","disputed"].includes(
      detail.payment?.service_payment_status
    );
  const bookingId=Number(booking?.id);

  useEffect(()=>{
    if(!checkout)return undefined;
    let mounted=true;
    (async()=>{
      try {
        const Stripe=await loadStripeJs();
        if(!mounted||!paymentContainer.current)return;
        const stripe=Stripe(checkout.stripe_publishable_key,{
          stripeAccount:checkout.stripe_account_id,
        });
        const elements=stripe.elements({
          clientSecret:checkout.payment_intent_client_secret,
        });
        const element=elements.create("payment",{
          layout:"tabs",
        });
        element.mount(paymentContainer.current);
        stripeInstance.current=stripe;
        elementsInstance.current=elements;
        paymentElement.current=element;
        if(mounted)setPhase("ready");
      }catch {
        if(mounted){setPhase("error");setError("Secure payment form unavailable.");}
      }
    })();
    return()=>{
      mounted=false;
      if(paymentElement.current){
        paymentElement.current.destroy();
        paymentElement.current=null;
      }
      stripeInstance.current=null;
      elementsInstance.current=null;
    };
  },[checkout]);

  if(!eligible)return null;

  async function begin() {
    if(phase!=="idle"&&phase!=="error")return;
    if(!Number.isSafeInteger(bookingId)||bookingId<=0)return;
    setError("");
    setNotice("");
    setPhase("starting");
    try {
      const url=API_BASE+
        "/public/clients/"+encodeURIComponent(String(clientId))+
        "/"+encodeURIComponent(String(token))+
        "/us-pay-c11/"+encodeURIComponent(String(bookingId))+"/intent";
      const response=await fetch(url,{
        method:"POST",cache:"no-store",credentials:"omit",
        headers:{"Content-Type":"application/json",Accept:"application/json"},
        body:"{}",
      });
      const body=await response.json().catch(()=>null);
      if(!response.ok||body?.ok!==true){
        throw new Error(String(body?.error||"US_C11_PAYMENT_NOT_AVAILABLE"));
      }
      const result=checkSdkContract(
        body,bookingId,detail.breakdown.charge_total_minor
      );
      setCheckout(result);
      setPhase("mounting");
    }catch(err){
      setError(String(err?.message||"US_C11_PAYMENT_START_FAILED"));
      setPhase("error");
    }
  }

  async function confirm() {
    if(phase!=="ready"||!stripeInstance.current||!elementsInstance.current)return;
    setError("");
    setPhase("confirming");
    try{
      const {error:stripeError}=await stripeInstance.current.confirmPayment({
        elements:elementsInstance.current,
        confirmParams:{return_url:RETURN_URL},
        redirect:"if_required",
      });
      if(stripeError){
        setError(String(stripeError.message||"Stripe could not process the payment."));
        setPhase("ready");
        return;
      }
      // Never update service_payment_status or mark booking paid from client.
      setNotice("Stripe confirmation received. Recheck the verified booking status.");
      setPhase("confirmed_client_side");
    }catch{
      setError("Unable to complete payment confirmation. Check your booking status.");
      setPhase("ready");
    }
  }

  return (
    <section aria-label="Secure Stripe payment" style={{
      border:"1px solid #cbd5e1",borderRadius:12,padding:16,
      background:"#fff",display:"grid",gap:12,marginTop:18,
    }}>
      <h3 style={{margin:0,fontSize:18}}>Secure payment · Stripe</h3>
      <p style={{margin:0,fontSize:14}}>
        Total: <strong>
          {formatUsPayC11Cents(detail.breakdown.charge_total_minor)}
        </strong>{" · "}Payee: {detail.collector.display_name}
      </p>
      {phase==="idle"||phase==="error" ? (
        <button type="button" onClick={begin}
          style={{minHeight:44,padding:"10px 16px",border:0,
            background:"#111827",color:"#fff",borderRadius:8}}>
          Pay securely with Stripe
        </button>
      ) : null}
      {phase==="starting"||phase==="mounting" ? (
        <p role="status">Preparing encrypted payment form…</p>
      ) : null}
      {checkout ? (
        <div ref={paymentContainer}
          style={{minHeight:phase==="mounting"?80:0}} />
      ) : null}
      {phase==="ready" ? (
        <button type="button" onClick={confirm}
          style={{minHeight:44,padding:"10px 16px",border:0,
            background:"#111827",color:"#fff",borderRadius:8}}>
          Confirm payment
        </button>
      ) : null}
      {phase==="confirming"?<p role="status">Waiting for Stripe…</p>:null}
      {notice?<p role="status">{notice}</p>:null}
      {error?<p role="alert" style={{color:"#991b1b"}}>{error}</p>:null}
      {phase==="confirmed_client_side" ? (
        <button type="button" onClick={()=>onRefresh?.()}
          style={{minHeight:44,padding:"10px 16px",borderRadius:8,
            background:"#f8fafc",border:"1px solid #94a3b8"}}>
          Recheck verified payment status
        </button>
      ) : null}
      <p style={{fontSize:12,color:"#64748b",margin:0}}>
        Card entry is handled by Stripe. TOTEM will only mark a payment
        received after a signed Stripe event is verified by the server.
      </p>
    </section>
  );
}
