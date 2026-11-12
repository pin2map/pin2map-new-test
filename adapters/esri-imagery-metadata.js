"use strict";
/* On-demand Esri World Imagery citations: exact ordered allowlist only.
 * No browser storage, automatic requests or fabricated metadata. */
(function(root){
  const KEYS=Object.freeze([
    ["Aufnahmedatum",["DATE","SRC_DATE","ACQUISITION_DATE","ACQUISITIONDATE","SRC_DATE2"]],
    ["Resolution",["RESOLUTION","SRC_RES"]],
    ["Accuracy",["ACCURACY","SRC_ACC"]],
    ["Source_info",["SOURCE_INFO","NICE_NAME"]],
    ["Datenquelle",["SOURCE","DATA_SOURCE","DATASOURCE","NICE_DESC","PROVIDER"]]
  ]);
  function available(value){
    if(value===null||value===undefined||!String(value).trim())return false;
    return !["99999","N/A","NULL","UNKNOWN","NO DATA"].includes(String(value).trim().toUpperCase());
  }
  function isoDate(value){
    const raw=String(value).trim();
    let match=/^(\d{4})(\d{2})(\d{2})$/.exec(raw);
    if(!match)match=/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(raw);
    if(!match)return null;
    const date=match.slice(1).join("-");
    const check=new Date(date+"T00:00:00Z");
    return !Number.isNaN(check.valueOf())&&check.toISOString().slice(0,10)===date?date:null;
  }
  function pick(attributes,names){
    const indexed=new Map(Object.entries(attributes).map(([key,value])=>[key.toUpperCase(),value]));
    for(const name of names){
      const value=indexed.get(name);
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
        const value=raw===null?"Nicht verfügbar":
          name==="Aufnahmedatum"?(isoDate(raw)||"Nicht verfügbar"):String(raw).trim();
        return {name,value};
      });
      return {fields,waybackUrl:waybackUrl({lat,lng},zoom)};
    }
  }
  const api=EsriImageryMetadata;
  api.isoDate=isoDate;
  root.Pin2MapEsriImageryMetadata=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
