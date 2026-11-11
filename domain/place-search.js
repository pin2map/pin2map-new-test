"use strict";
/* Pure search-domain helpers: no HTTP, DOM, storage or map dependencies. */
(function(root){
  // Preserve the predecessor's place-result display contract, not its DOM.
  function title(result){
    return String(result?.name||String(result?.display_name||"").split(",")[0]||"").trim();
  }
  function detail(result){return String(result?.display_name||"").trim();}
  function kind(result){
    const type=String(result?.addresstype||result?.type||"").toLowerCase();
    const category=String(result?.class||result?.category||"").toLowerCase();
    const names={city:"Stadt",town:"Stadt",village:"Dorf",hamlet:"Weiler",
      suburb:"Stadtteil",quarter:"Stadtviertel",neighbourhood:"Wohngebiet",
      locality:"Ortslage",municipality:"Gemeinde",county:"Landkreis",
      state:"Bundesland",country:"Land",borough:"Stadtbezirk",
      district:"Bezirk",administrative:"Verwaltungsgebiet",
      postcode:"Postleitzahl",road:"Straße",residential:"Wohnstraße",
      house:"Gebäude",building:"Gebäude",island:"Insel",peak:"Gipfel",
      river:"Fluss",lake:"See",park:"Park",forest:"Wald",station:"Bahnhof"};
    let label=names[type]||"";
    if(category==="boundary"&&type==="administrative")label="Verwaltungsgebiet";
    if(!label&&category==="place")label="Ort";
    if(!label&&category==="highway")label="Straße";
    if(!label&&category==="building")label="Gebäude";
    if(!label)label="Ort / Objekt";
    const point=result?.osm_type==="node";
    if(point&&/^(Stadt|Dorf|Weiler|Gemeinde|Stadtteil|Stadtviertel|Ortslage|Ort)$/.test(label))
      label+=" · Ortsmittelpunkt";
    else if(!point&&/^(Stadt|Dorf|Gemeinde|Stadtteil|Ort)$/.test(label))
      label+=" · Gebiet";
    return {label,symbol:category==="boundary"?"▧":point?"●":"▱"};
  }
  function duplicateCoordinates(results){
    const counts=new Map();
    for(const result of results){
      const key=title(result)+"|"+detail(result);
      counts.set(key,(counts.get(key)||0)+1);
    }
    return results.map(result=>{
      const key=title(result)+"|"+detail(result);
      const lat=Number(result?.lat),lon=Number(result?.lon);
      return counts.get(key)>1&&Number.isFinite(lat)&&Number.isFinite(lon)
        ? "Position: "+lat.toFixed(5)+", "+lon.toFixed(5):"";
    });
  }
  function cacheKey(query){return String(query).trim().replace(/\s+/g," ").toLocaleLowerCase("de");}
  function cleanCache(cache,now,ttlMs=24*3600000,limit=100){
    return Object.fromEntries(Object.entries(cache||{}).filter(([,v])=>
      v&&typeof v.time==="number"&&Number.isFinite(v.time)&&
      now-v.time>=0&&now-v.time<ttlMs&&Array.isArray(v.results)
    ).slice(-limit));
  }
  const api=Object.freeze({title,detail,kind,duplicateCoordinates,cacheKey,cleanCache});
  root.Pin2MapPlaceSearch=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
