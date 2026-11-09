"use strict";
/* Pure search-domain helpers: no HTTP, DOM, storage or map dependencies. */
(function(root){
  function title(result){
    const a=result.address||{};
    return a.city||a.town||a.village||a.hamlet||a.municipality||a.suburb||a.county||result.name||String(result.display_name||"").split(",")[0];
  }
  function detail(result){
    const a=result.address||{};
    const parts=[a.state||a.region||a.county,a.country].filter(Boolean);
    return parts.join(", ")||String(result.display_name||"").split(",").slice(1,4).join(",").trim();
  }
  function cacheKey(query){return String(query).trim().replace(/\s+/g," ").toLocaleLowerCase("de");}
  function cleanCache(cache,now,ttlMs=24*3600000,limit=100){
    return Object.fromEntries(Object.entries(cache||{}).filter(([,v])=>
      v&&typeof v.time==="number"&&Number.isFinite(v.time)&&
      now-v.time>=0&&now-v.time<ttlMs&&Array.isArray(v.results)
    ).slice(-limit));
  }
  const api=Object.freeze({title,detail,cacheKey,cleanCache});
  root.Pin2MapPlaceSearch=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
