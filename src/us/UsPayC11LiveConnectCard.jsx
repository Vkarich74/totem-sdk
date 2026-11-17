// TOTEM US-PAY-C11: LIVE Stripe Connect seller authorization UI.
// Only authenticated US salon/master may start; no payment functionality.
// Existing seller: Stripe OAuth. New seller: Stripe Standard onboarding.
// Actual merchant connection acceptance intentionally deferred.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  readLiveSellerConnect,
  refreshLiveSellerConnect,
  requireTrustedStripeOnboardingUrl,
  requireTrustedStripeOAuthUrl,
  startLiveSellerConnect,
  startExistingLiveSellerConnect,
} from "./usPayC11LiveConnectClient.js";

const labels = {
  not_started: "Not connected",
  initiated: "Connection not completed",
  onboarding: "Identity verification in progress",
  restricted: "Stripe account restricted — review required",
  verified: "Connected and verified",
  revoked: "Connection revoked",
};
const buttonStyle = {
  padding:"12px 16px",borderRadius:8,border:0,background:"#111827",
  color:"#fff",fontWeight:700,minHeight:44,maxWidth:440,
};

export default function UsPayC11LiveConnectCard({
  ownerType,ownerId,isUsMarket,
}) {
  const location=useLocation();
  const [state,setState]=useState({loading:true,data:null,error:""});
  const [choice,setChoice]=useState("existing");
  const [consent,setConsent]=useState(false);
  const [working,setWorking]=useState(false);
  const [notice,setNotice]=useState("");
  const actualId=Number(ownerId);
  const validOwner=["salon","master"].includes(ownerType) &&
    Number.isSafeInteger(actualId) && actualId>0;

  useEffect(()=>{
    if(!isUsMarket || !validOwner)return undefined;
    let active=true;
    const controller=new AbortController();
    setState({loading:true,data:null,error:""});
    readLiveSellerConnect(ownerType,actualId,controller.signal)
      .then(async data=>{
        const callback=new URLSearchParams(location.search).get("us_connect");
        if(callback==="return" || callback==="linked") {
          try{return await refreshLiveSellerConnect(ownerType,actualId);}
          catch{return data;}
        }
        return data;
      })
      .then(data=>{
        if(active)setState({loading:false,data,error:""});
      })
      .catch(error=>{
        if(active&&!controller.signal.aborted) {
          setState({loading:false,data:null,
            error:error?.message||"US_CONNECT_UNAVAILABLE"});
        }
      });
    return ()=>{active=false;controller.abort();};
  },[isUsMarket,validOwner,ownerType,actualId,location.search]);

  if(!isUsMarket)return null;

  const details=state.data;
  const method=details?.connection_method||"none";
  const status=details?.verification_status||"not_started";
  const previouslyBound=details?.onboarding_started===true;
  const verified=details?.verified===true;
  const revoked=status==="revoked";
  const canStart=!state.loading&&!working&&validOwner&&!revoked&&!verified&&
    // A seller with a connected account cannot link ANOTHER Stripe account.
    (!previouslyBound || (method==="new_standard" && choice==="new"));
  const callback=new URLSearchParams(location.search).get("us_connect");

  async function begin() {
    if(!canStart || !consent)return;
    setWorking(true);
    setNotice("");
    try {
      if(choice==="existing") {
        const response=await startExistingLiveSellerConnect(
          ownerType,actualId,true);
        const url=requireTrustedStripeOAuthUrl(response.oauth_authorize_url);
        window.location.assign(url);
      } else {
        const response=await startLiveSellerConnect(
          ownerType,actualId,true);
        const url=requireTrustedStripeOnboardingUrl(response.onboarding_url);
        window.location.assign(url);
      }
    }catch(error) {
      setNotice(error?.message||"US_CONNECT_UNAVAILABLE");
      setWorking(false);
    }
  }

  async function verify() {
    if(!validOwner||working||!previouslyBound)return;
    setWorking(true);
    setNotice("");
    try {
      const updated=await refreshLiveSellerConnect(ownerType,actualId);
      setState({loading:false,data:updated,error:""});
      setNotice(updated.verified
        ? "Stripe account verified. TOTEM payments are not yet enabled."
        : "Stripe verification is incomplete. Review your Stripe Dashboard.");
    }catch(error) {
      setNotice(error?.message||"US_CONNECT_REFRESH_FAILED");
    }finally {
      setWorking(false);
    }
  }

  return (
    <section aria-label="USA Stripe Connect seller authorization" style={{
      border:"1px solid #cbd5e1",borderRadius:12,background:"#f8fafc",
      padding:18,display:"grid",gap:14,margin:"18px 0",
    }}>
      <h3 style={{fontSize:18,margin:0}}>Stripe Connect · USA</h3>
      <p style={{margin:0,lineHeight:1.5}}>
        Connect your own US Stripe Standard account to receive client
        payments directly when payment services become available.
        Stripe verifies your identity and payout information.
      </p>

      {state.loading ? (
        <p role="status">Checking Stripe connection…</p>
      ) : state.error ? (
        <p role="alert" style={{color:"#991b1b"}}>
          Connection unavailable: {state.error}
        </p>
      ) : (
        <>
          <p style={{margin:0}}>
            Status: <strong>{labels[status]||"Unknown"}</strong>
            {" · "}Payments: <strong>{details?.charges_enabled?"Eligible":"Inactive"}</strong>
            {" · "}Payouts: <strong>{details?.payouts_enabled?"Eligible":"Inactive"}</strong>
          </p>

          {!verified&&!revoked&&!previouslyBound ? (
            <fieldset style={{
              border:"1px solid #e2e8f0",borderRadius:8,padding:12,
              display:"grid",gap:12,
            }}>
              <legend style={{fontWeight:700,padding:"0 5px"}}>
                Choose how to connect
              </legend>
              <label style={{display:"flex",gap:9,alignItems:"start"}}>
                <input type="radio" name={`us-connect-${ownerType}-${actualId}`}
                  checked={choice==="existing"}
                  onChange={()=>{setChoice("existing");setConsent(false);}}
                  disabled={working} />
                <span>
                  <strong>I already have a Stripe account.</strong>
                  {" "}Authorize TOTEM through Stripe. No second merchant
                  account will be created.
                </span>
              </label>
              <label style={{display:"flex",gap:9,alignItems:"start"}}>
                <input type="radio" name={`us-connect-${ownerType}-${actualId}`}
                  checked={choice==="new"}
                  onChange={()=>{setChoice("new");setConsent(false);}}
                  disabled={working} />
                <span>
                  <strong>I do not have a Stripe account.</strong>
                  {" "}Set up one new Standard account in Stripe.
                </span>
              </label>
            </fieldset>
          ) : null}

          {!verified&&!revoked&&(!previouslyBound||method==="new_standard") ? (
            <>
              <label style={{display:"flex",gap:9,alignItems:"start",lineHeight:1.45}}>
                <input type="checkbox" checked={consent}
                  onChange={event=>setConsent(event.target.checked)}
                  disabled={working} style={{width:19,height:19,marginTop:2}} />
                <span>
                  I am the account holder or authorized representative of
                  this {ownerType==="salon"?"salon":"professional business"}.
                  I authorize TOTEM to {choice==="existing"
                    ? "request my permission to connect my existing Stripe account"
                    : "create one new Stripe Standard account for this business"}.
                  I will review Stripe's terms directly on Stripe.
                </span>
              </label>
              <button type="button" onClick={begin}
                disabled={!canStart||!consent} style={{
                  ...buttonStyle,
                  opacity:!canStart||!consent?0.55:1,
                  cursor:canStart&&consent?"pointer":"not-allowed",
                }}>
                {working?"Opening Stripe…" :
                  previouslyBound ? "Continue new account verification" :
                  choice==="existing" ? "Authorize existing Stripe account" :
                  "Create my new Stripe Standard account"}
              </button>
            </>
          ) : null}

          {previouslyBound && !revoked ? (
            <button type="button" onClick={verify}
              disabled={working}
              style={{...buttonStyle,background:"#fff",color:"#111827",
                border:"1px solid #94a3b8"}}>
              Recheck account verification
            </button>
          ) : null}
          {method==="oauth_existing"&&!verified ? (
            <p role="note">
              Manage any outstanding verification requirements in your
              existing Stripe Dashboard. TOTEM will recheck your account.
            </p>
          ) : null}
        </>
      )}

      {callback==="denied" ? (
        <p role="status">Stripe authorization was declined. No account was connected.</p>
      ) : null}
      {callback==="failed" ? (
        <p role="alert">Stripe authorization could not be completed.
          Use your own Stripe account to authorize again.</p>
      ) : null}
      {callback==="linked" ? (
        <p role="status">Stripe authorization received. Check the verification status above.</p>
      ) : null}
      {callback==="refresh" ? (
        <p role="note">A Stripe onboarding link expired. Continue from this screen.</p>
      ) : null}
      {notice ? <p role="status">{notice}</p>:null}
      <p role="note" style={{fontSize:13,color:"#64748b",margin:0}}>
        Connecting a seller never initiates a charge or activates checkout
        in TOTEM. Payment processing requires a separate release approval.
      </p>
    </section>
  );
}
