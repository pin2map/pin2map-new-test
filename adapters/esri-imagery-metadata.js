"use strict";
/* On-demand Esri World Imagery citations: exact ordered allowlist only.
 * No browser storage, automatic requests or fabricated metadata. */
(function(root){
  const KEYS=Object.freeze([
    ["Aufnahmedatum",["DATE","DATE (YYYYMMDD)","SRC_DATE","SRC_DATE2","ACQUISITION_DATE","ACQUISITIONDATE"]],
    ["Resolution",["RESOLUTION","RESOLUTION (M)","SRC_RES"]],
    ["Accuracy",["ACCURACY","ACCURACY (M)","SRC_ACC"]],
    ["Source_info",["SOURCE_INFO","NICE_NAME"]],
    ["Datenquelle",["SOURCE","DATA_SOURCE","DATASOURCE","NICE_DESC","PROVIDER"]]
  ]);
  function available(value){
    if(value===null||value===undefined||!String(value).trim())return false;
    return !["99999","N/A","NULL","UNKNOWN","NO DATA"].includes(String(value).trim().toUpperCase());
  }
  // Esri Identify exposes layer field aliases (for example
  // "DATE (YYYYMMDD)" and "RESOLUTION (M)"), not always field names.
  // Accept both, but do not format or otherwise transform their values.
  function fieldKey(value){return String(value).toUpperCase().replace(/[^A-Z0-9]/g,"");}
  function pick(attributes,names){
    const indexed=new Map(Object.entries(attributes).map(([key,value])=>[fieldKey(key),value]));
    for(const name of names){
      const value=indexed.get(fieldKey(name));
      if(available(value))return value;
    }
    return null;
  }
  function waybackUrl(point,zoom){
    // Wayback supports location-centered mapCenter fragment without choosing a historic release.
    const lng=Number(point.lng),lat=Number(point.lat);
    const level=Math.max(0,Math.min(23,Math.round(Number(zoom)||16)));
    return "https://livingatlas.arcgis.com/wayback/#mapCenter="+encodeURIComponent(lng+","+lat+","+level);
  }
  class EsriImageryMetadata{
    constructor({fetchImpl=fetch}={}){this.fetchImpl=fetchImpl;}
    async identify(point,viewport,{signal}={}){
      const lat=Number(point.lat),lng=Number(point.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)
        throw new RangeError("Ungültige Position");
      const zoom=Math.max(0,Math.min(23,Math.round(Number(viewport?.zoom)||16)));
      const span=360/Math.pow(2,zoom);
      const validBounds=Array.isArray(viewport?.bounds)&&viewport.bounds.length===4&&
        viewport.bounds.every(x=>Number.isFinite(Number(x)));
      const extent=validBounds?viewport.bounds.join(","):
        [lng-span,lat-span/2,lng+span,lat+span/2].join(",");
      const width=Math.max(1,Math.round(Number(viewport?.width)||800));
      const height=Math.max(1,Math.round(Number(viewport?.height)||600));
      const params=new URLSearchParams({
        f:"json",geometry:lng+","+lat,geometryType:"esriGeometryPoint",
        sr:"4326",layers:"all:4",tolerance:"2",mapExtent:extent,
        imageDisplay:width+","+height+",96",returnGeometry:"false"
      });
      const url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/identify?"+params;
      const response=await this.fetchImpl(url,{signal,cache:"no-store"});
      if(!response.ok)throw new Error("Esri-Antwort "+response.status);
      const json=await response.json();
      if(json.error)throw new Error("Esri-Metadaten nicht verfügbar");
      const attributes=json.results?.find(item=>item.layerId===4)?.attributes
        ||json.results?.[0]?.attributes;
      const fields=KEYS.map(([name,keys])=>{
        const raw=attributes?pick(attributes,keys):null;
        const value=raw===null?"Nicht verfügbar":String(raw);
        return {name,value};
      });
      return {fields,waybackUrl:waybackUrl({lat,lng},zoom)};
    }
  }
  const api=EsriImageryMetadata;
  root.Pin2MapEsriImageryMetadata=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
