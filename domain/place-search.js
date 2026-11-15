"use strict";
/* Pure search-domain helpers: no HTTP, DOM, storage or map dependencies. */
(function(root){
  // Preserve the predecessor's place-result display contract, not its DOM.
  function title(result){
    return String(result?.name||String(result?.display_name||"").split(",")[0]||"").trim();
  }
  function detail(result){return String(result?.display_name||"").trim();}
  function pinName(result){
    const address=result?.address||{};
    const road=String(address.road||address.pedestrian||address.residential||
      address.footway||address.path||address.street||"").trim();
    const number=String(address.house_number||"").trim();
    // Nominatim may set "name" to just the house number. Prefer the full
    // street address for new pin names; keep settlement-only names intact.
    if(road&&number)return road+" "+number;
    if(road)return road;
    const name=title(result);
    if(number&&name===number){
      const parts=String(result?.display_name||"").split(",").map(s=>s.trim()).filter(Boolean);
      // Fallback for provider records lacking a structured road field:
      // "49, Bilser Str., Hamburg, ..." -> "Bilser Str. 49".
      const locality=String(address.city||address.town||address.village||address.municipality||"").trim();
      if(parts[0]===number&&parts.length>=3&&parts[1]&&parts[1]!==locality)
        return parts[1]+" "+number;
    }
    return name;
  }
  // Use the map zoom AT THE USER'S TAP, not the adapter's subsequent
  // automatic zoom. Nominatim zoom 10 returns a city-level address; zoom 13
  // allows standalone villages at close scales without seeking neighbourhoods.
  function reversePlaceZoom(mapZoom){
    return Number.isFinite(mapZoom)&&mapZoom>=15?13:10;
  }
  // An OSM reverse hit may be a nearby object whose small place component
  // belongs to an adjacent village. Prefer the main settlement (city/town)
  // even on a detailed map. Small localities are fallback ONLY if no city or
  // town is present. Never choose quarter/suburb/neighbourhood as a city name.
  function nearbyLocalityName(result,{mapZoom=10}={}){
    const address=result?.address||{};
    const read=key=>{
      const name=String(address[key]||"").trim();
      return name&&name.length<=120?name:"";
    };
    for(const key of ["city","town"]){
      const name=read(key);if(name)return name;
    }
    if(reversePlaceZoom(mapZoom)===10){
      const name=read("municipality");if(name)return name;
    }
    for(const key of ["village","hamlet","locality"]){
      const name=read(key);if(name)return name;
    }
    const municipality=read("municipality");
    if(municipality)return municipality;
    // Nominatim's addresstype/name may describe a near-by suburb, not the
    // clicked main town; accept only a standalone settlement classification.
    const type=String(result?.addresstype||result?.type||"").toLowerCase();
    if(["city","town","village","hamlet"].includes(type)){
      const name=title(result);if(name&&name.length<=120)return name;
    }
    return "";
  }
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
  const api=Object.freeze({title,detail,pinName,reversePlaceZoom,nearbyLocalityName,kind,duplicateCoordinates,cacheKey,cleanCache});
  root.Pin2MapPlaceSearch=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
