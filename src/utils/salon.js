export function getSalonSlug(){
  try{
    const w = (window.SALON_SLUG || "").trim();
    if(w){
      localStorage.setItem("TOTEM_SALON_SLUG", w);
      return w;
    }

    const ls = (localStorage.getItem("TOTEM_SALON_SLUG") || "").trim();
    if(ls) return ls;

    const qs = new URLSearchParams(window.location.search);
    const q = (qs.get("salon") || "").trim();
    if(q){
      localStorage.setItem("TOTEM_SALON_SLUG", q);
      return q;
    }
  }catch(e){
    /* ignore */
  }

  return "totem-demo-salon";
}
