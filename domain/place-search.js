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
  // Original click scale; raster labels cannot be read from a tile.
  // Nominatim zoom 10=city, 13=village/suburb, 15=settlement.
  function reversePlaceZoom(mapZoom){
    return !Number.isFinite(mapZoom)||mapZoom<12?10:mapZoom<15?13:15;
  }
  function groundDistanceMeters(a,b){
    const lat1=Number(a?.lat),lon1=Number(a?.lng),
      lat2=Number(b?.lat),lon2=Number(b?.lon);
    if(![lat1,lon1,lat2,lon2].every(Number.isFinite))return null;
    const rad=Math.PI/180,dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
    const h=Math.sin(dLat/2)**2+
      Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
    return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  // A named, directly resolved OSM settlement is stronger evidence than an
  // address component which may belong to a neighbouring administrative area.
  // Do NOT prefer arbitrary suburb/district tags over main-city names.
  function nearbyLocalityName(result,{mapZoom=10,point=null}={}){
    const address=result?.address||{};
    const read=key=>{
      const name=String(address[key]||"").trim();
      return name&&name.length<=120?name:"";
    };
    const kind=String(result?.addresstype||result?.type||"").toLowerCase();
    const direct=title(result);
    const city=read("city")||read("town");
    const village=read("village")||read("hamlet")||read("locality");
    if(reversePlaceZoom(mapZoom)>=13){
      const isSettlement=["village","hamlet","locality"].includes(kind);
      const isDirect=isSettlement&&direct&&direct.length<=120&&
        (!village||direct===village);
      if(isDirect){
        const distance=groundDistanceMeters(point,result);
        const limit=mapZoom>=15?1100:1800;
        if(distance===null||distance<=limit)return direct;
      }
      // Some reverse responses provide a village in the address hierarchy,
      // but name only the surrounding administration. Use it only when no
      // distinct city/town is given, never override a known main city.
      if(!city&&village)return village;
    }
    if(city)return city;
    const municipality=read("municipality");
    if(reversePlaceZoom(mapZoom)===10&&municipality)return municipality;
    if(village)return village;
    if(municipality)return municipality;
    if(["city","town","village","hamlet"].includes(kind)&&
      direct&&direct.length<=120)return direct;
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
