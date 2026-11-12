"use strict";
/* On-demand Esri World Imagery citations. No background fetch or storage. */
(function(root){
  class EsriImageryMetadata{
    constructor({fetchImpl=fetch}={}){this.fetchImpl=fetchImpl;}
    async identify(point,viewport,{signal}={}){
      const lat=Number(point.lat),lng=Number(point.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)
        throw new RangeError("Ungültige Position");
      const center=viewport?.center||point;
      const zoom=Math.max(0,Math.min(23,Math.round(Number(viewport?.zoom)||16)));
      const span=360/Math.pow(2,zoom);
      const extent=[lng-span,lat-span/2,lng+span,lat+span/2].join(",");
      const params=new URLSearchParams({
        f:"json",geometry:lng+","+lat,geometryType:"esriGeometryPoint",
        sr:"4326",layers:"all:4",tolerance:"2",mapExtent:extent,
        imageDisplay:"800,600,96",returnGeometry:"false"
      });
      const url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/identify?"+params;
      const response=await this.fetchImpl(url,{signal,cache:"no-store"});
      if(!response.ok)throw new Error("Esri-Antwort "+response.status);
      const json=await response.json();
      if(json.error)throw new Error("Esri-Metadaten nicht verfügbar");
      const attributes=json.results?.find(item=>item.layerId===4)?.attributes
        ||json.results?.[0]?.attributes;
      if(!attributes)return {fields:[],message:"Keine Bildinformationen für diesen Punkt verfügbar"};
      const fields=Object.entries(attributes)
        .filter(([key,value])=>value!==null&&value!==undefined&&value!==""&&value!==99999&&value!=="99999")
        .filter(([key])=>!/^(objectid|shape|fid|globalid|st_area|st_length)$/i.test(key))
        .map(([key,value])=>{
          const normalized=key.toLowerCase().replace(/[^a-z]/g,"");
          const labels={date:"Aufnahmedatum",acquisitiondate:"Aufnahmedatum",
            provider:"Bildanbieter",source:"Datenquelle",datasource:"Datenquelle",
            resolution:"Auflösung (m)",accuracy:"Genauigkeit (m)"};
          let readable=String(value);
          if((normalized==="date"||normalized==="acquisitiondate")&&/^\\d{8}$/.test(readable)){
            const y=readable.slice(0,4),m=readable.slice(4,6),d=readable.slice(6,8);
            const parsed=new Date(y+"-"+m+"-"+d+"T00:00:00Z");
            if(!Number.isNaN(parsed.valueOf())&&
              parsed.toISOString().slice(0,10)===y+"-"+m+"-"+d)readable=d+"."+m+"."+y;
          }
          return {name:labels[normalized]||key,value:readable};
        });
      return {fields,message:fields.length?"":"Keine Bildinformationen für diesen Punkt verfügbar"};
    }
  }
  root.Pin2MapEsriImageryMetadata=EsriImageryMetadata;
  if(typeof module!=="undefined"&&module.exports)module.exports=EsriImageryMetadata;
})(typeof window!=="undefined"?window:globalThis);
