export async function safeJson(url, opts){
  const r = await fetch(url, opts);
  const ct = (r.headers.get("content-type") || "").toLowerCase();

  if(!r.ok){
    const t = await r.text().catch(()=> "");
    return { ok:false, status:r.status, ct, text:t };
  }

  if(!ct.includes("application/json")){
    const t = await r.text().catch(()=> "");
    return { ok:false, status:r.status, ct, text:t };
  }

  try{
    const j = await r.json();
    return { ok:true, json:j };
  }catch(e){
    const t = await r.text().catch(()=> "");
    return { ok:false, status:r.status, ct, text:t };
  }
}
