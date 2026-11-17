// TOTEM USA / TAX-06 — owner service-tax API. No Stripe calls.
// Always scoped to the authenticated US salon/master. No localStorage rate,
// no legacy KGS price conversion, no invented tax value on API failure.
const OWNER_TYPES=new Set(["salon","master"]);
const SLUG=/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;

function fail(code,status=0) {
  const error=new Error(code);
  error.code=code;
  error.status=status;
  return error;
}

function target(ownerType,ownerSlug){
  if(!OWNER_TYPES.has(ownerType)||typeof ownerSlug!=="string"||
      !SLUG.test(ownerSlug)){
    throw fail("US_TAX_OWNER_TARGET_INVALID");
  }
  return `${encodeURIComponent(ownerType)}/${encodeURIComponent(ownerSlug)}`;
}

function endpoint(apiBase,ownerType,ownerSlug){
  const base=String(apiBase || (
    typeof window!=="undefined" && window.TOTEM_API_BASE
  ) || "https://api.totemv.com").replace(/\/$/,"");
  const parsed=new URL(base);
  if(parsed.protocol!=="https:" && parsed.hostname!=="127.0.0.1" &&
     parsed.hostname!=="localhost"){
    throw fail("US_TAX_API_ORIGIN_INVALID");
  }
  return `${base}/internal/us-service-tax/${target(ownerType,ownerSlug)}`;
}

export function parseUsServiceTaxPercent(value) {
  const text=String(value??"").trim();
  if(!/^(?:100(?:[.,]0{1,2})?|(?:0|[1-9]\d?)(?:[.,]\d{1,2})?)$/.test(text)){
    return null;
  }
  const [whole,part=""]=text.replace(",",".").split(".");
  const bps=Number(whole)*100+Number(part.padEnd(2,"0")||"0");
  return Number.isSafeInteger(bps)&&bps>=0&&bps<=10000 ? bps:null;
}

export function formatUsServiceTaxPercent(bps) {
  if(!Number.isSafeInteger(bps)||bps<0||bps>10000)return null;
  return (Math.floor(bps/100)).toString()+
    ((bps%100)>0?"."+String(bps%100).padStart(2,"0").replace(/0$/,""):"");
}

function accepted(payload,ownerType,ownerSlug) {
  if(payload?.ok!==true || payload.market_code!=="US" ||
     payload.currency_code!=="USD" ||
     payload.payment_purpose!=="beauty_service" ||
     payload.owner_type!==ownerType || payload.owner_slug!==ownerSlug ||
     !Number.isSafeInteger(payload.rate_bps) ||
     payload.rate_bps<0 || payload.rate_bps>10000 ||
     !Number.isSafeInteger(payload.revision) || payload.revision<0 ||
     typeof payload.configured!=="boolean" ||
     (payload.configured ? payload.revision<1 :
      (payload.revision!==0 || payload.rate_bps!==0))){
    throw fail("US_TAX_API_CONTRACT_INVALID");
  }
  const expected=(payload.rate_bps/100).toFixed(2);
  if(payload.tax_percent!==expected){
    throw fail("US_TAX_API_RATE_MISMATCH");
  }
  return Object.freeze({
    rate_bps:payload.rate_bps,
    revision:payload.revision,
    configured:payload.configured,
    owner_type:ownerType,
    owner_slug:ownerSlug,
    market_code:"US",
    currency_code:"USD",
    payment_purpose:"beauty_service",
  });
}

async function request(method,{
  ownerType,ownerSlug,token,rateBps,expectedRevision,apiBase,
  signal,fetchImpl=globalThis.fetch,
}={}){
  if(typeof token!=="string" || token.length<12 ||
     typeof fetchImpl!=="function"){
    throw fail("US_TAX_OWNER_AUTH_REQUIRED",403);
  }
  if(method==="PUT" &&
     (!Number.isSafeInteger(rateBps)||rateBps<0||rateBps>10000||
      !Number.isSafeInteger(expectedRevision)||expectedRevision<0)){
    throw fail("US_TAX_RATE_OR_REVISION_INVALID",400);
  }
  const url=endpoint(apiBase,ownerType,ownerSlug);
  const response=await fetchImpl(url,{
    method,cache:"no-store",credentials:"omit",signal,
    headers:{
      Accept:"application/json",
      Authorization:`Bearer ${token}`,
      ...(method==="PUT"?{"Content-Type":"application/json"}:{}),
    },
    ...(method==="PUT"?{body:JSON.stringify({
      rate_bps:rateBps,expected_revision:expectedRevision,
    })}:{}),
  });
  const body=await response.json().catch(()=>null);
  if(!response.ok){
    const serverCode=typeof body?.error==="string" &&
      /^US_TAX_[A-Z0-9_]{3,90}$/.test(body.error)
        ? body.error:"US_TAX_API_UNAVAILABLE";
    throw fail(serverCode,response.status);
  }
  return accepted(body,ownerType,ownerSlug);
}

export function readUsServiceTax(options){
  return request("GET",options);
}
export function saveUsServiceTax(options){
  return request("PUT",options);
}
