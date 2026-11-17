// US-PAY-C11 Live Stripe Standard onboarding — US-only salon/master account.
// This panel is a consent flow, NOT a checkout flow. No account impersonation.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  readLiveSellerConnect,
  refreshLiveSellerConnect,
  requireTrustedStripeOnboardingUrl,
  startLiveSellerConnect,
} from "./usPayC11LiveConnectClient.js";

const text = {
  not_started: "Not connected",
  initiated: "Account setup started",
  onboarding: "Identity verification required",
  restricted: "Stripe verification incomplete or restricted",
  verified: "Connected and verified",
  revoked: "Connection revoked",
};

export default function UsPayC11LiveConnectCard({
  ownerType, ownerId, isUsMarket,
}) {
  const location=useLocation();
  const [state,setState]=useState({loading:true,data:null,error:""});
  const [consent,setConsent]=useState(false);
  const [working,setWorking]=useState(false);
  const [notice,setNotice]=useState("");
  const actualId=Number(ownerId);
  const validOwner=["salon","master"].includes(ownerType) &&
    Number.isSafeInteger(actualId) && actualId>0;

  useEffect(()=>{
    if(!isUsMarket||!validOwner) return undefined;
    let active=true;
    const controller=new AbortController();
    setState({loading:true,data:null,error:""});
    readLiveSellerConnect(ownerType,actualId,controller.signal)
      .then(async data=>{
        const callback=new URLSearchParams(location.search).get("us_connect");
        if(callback==="return") {
          try{return await refreshLiveSellerConnect(ownerType,actualId);}
          catch {return data;}
        }
        return data;
      })
      .then(data=>{
        if(active)setState({loading:false,data,error:""});
      })
      .catch(error=>{
        if(active && !controller.signal.aborted)
          setState({loading:false,data:null,error:error?.message||"US_CONNECT_UNAVAILABLE"});
      });
    return ()=>{active=false;controller.abort();};
  },[isUsMarket,validOwner,ownerType,actualId,location.search]);

  if(!isUsMarket) return null;

  const connected=state.data?.verified===true;
  const disabled=state.loading||working||!validOwner||connected||
    state.data?.verification_status==="revoked";

  async function begin() {
    if(disabled||!consent)return;
    setWorking(true);
    setNotice("");
    try {
      const response=await startLiveSellerConnect(ownerType,actualId,true);
      const url=requireTrustedStripeOnboardingUrl(response.onboarding_url);
      // The link is one-time; navigate directly without storing or sharing it.
      window.location.assign(url);
    }catch(error){
      setNotice(error?.message||"US_CONNECT_UNAVAILABLE");
      setWorking(false);
    }
  }

  async function verify() {
    if(!validOwner||working)return;
    setWorking(true);
    try {
      const result=await refreshLiveSellerConnect(ownerType,actualId);
      setState({loading:false,data:result,error:""});
      setNotice(result.verified
        ? "Stripe has verified your account. Payments remain disabled until final release."
        : "Stripe has not yet completed verification.");
    } catch(error){
      setNotice(error?.message||"US_CONNECT_REFRESH_FAILED");
    }finally{
      setWorking(false);
    }
  }

  const stateCode=state.data?.verification_status||"not_started";
  const returned=new URLSearchParams(location.search).get("us_connect");

  return (
    <section aria-label="US Stripe Connect merchant onboarding" style={{
      border:"1px solid #d1d5db",borderRadius:12,
      background:"#f8fafc",padding:18,display:"grid",gap:12,margin:"18px 0",
    }}>
      <h3 style={{fontSize:18,margin:0}}>Stripe Connect · USA</h3>
      <p style={{margin:0,color:"#374151",lineHeight:1.5}}>
        Connect your own verified United States Stripe account to receive
        client payments directly as a salon or independent professional.
        Stripe handles the identity and bank verification.
      </p>
      {state.loading ? (
        <p role="status">Checking connection…</p>
      ) : state.error ? (
        <p role="alert" style={{color:"#991b1b"}}>
          Stripe Connect is unavailable: {state.error}
        </p>
      ) : (
        <>
          <p style={{margin:0}}>
            Connection status: <strong>{text[stateCode]||"Unknown"}</strong>
          </p>
          <p style={{margin:0}}>
            Card payments: <strong>{state.data?.charges_enabled ? "Eligible" : "Not active"}</strong>
            {" · "}Payouts: <strong>{state.data?.payouts_enabled ? "Eligible" : "Not active"}</strong>
          </p>
          {!connected && stateCode!=="revoked" ? (
            <>
              <label style={{display:"flex",gap:10,alignItems:"start",lineHeight:1.45}}>
                <input type="checkbox" checked={consent}
                  onChange={event=>setConsent(event.target.checked)}
                  disabled={working} style={{width:19,height:19,marginTop:2}} />
                <span>
                  I confirm I am the account holder or authorized representative
                  of this {ownerType==="salon"?"salon":"professional"} and authorize
                  TOTEM to initiate Stripe Connect onboarding for my own business.
                  I will review Stripe's verification and service terms there.
                </span>
              </label>
              <button type="button" onClick={begin}
                disabled={disabled||!consent}
                style={{padding:"12px 16px",borderRadius:8,border:0,
                  background:"#111827",color:"white",fontWeight:700,
                  maxWidth:360,opacity:disabled||!consent?.5:1,cursor:"pointer"}}>
                {working ? "Opening Stripe…" :
                  stateCode==="not_started" ? "Connect my Stripe account" :
                  "Continue Stripe onboarding"}
              </button>
            </>
          ) : null}
          {stateCode!=="not_started" && stateCode!=="revoked" ? (
            <button type="button" onClick={verify} disabled={working}
              style={{padding:"10px 14px",background:"white",
                border:"1px solid #94a3b8",borderRadius:8,maxWidth:290}}>
              Recheck Stripe verification
            </button>
          ) : null}
        </>
      )}
      {returned==="refresh" ? (
        <p role="note">The previous Stripe onboarding link expired. Confirm and continue to obtain a new one.</p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      <p role="note" style={{fontSize:13,color:"#6b7280",margin:0}}>
        Connecting an account does not charge customers or enable payouts in TOTEM.
        Booking payment controls remain disabled until the full payment integration is approved.
      </p>
    </section>
  );
}
