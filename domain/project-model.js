"use strict";
/*
 * Domain-only project model for pin2map NEW.
 * No DOM, Leaflet, MapLibre, network, IndexedDB or localStorage access.
 * Data semantics are independent of the map renderer.
 * Public geometry conventions: point {lat,lng}, GeoJSON coordinates [lng,lat].
 */
(function(root){
  const PRIVATE_ID="private";
  const DEFAULT_COLORS=Object.freeze(["#326cc2","#e07c2b","#865ab8","#16836b","#c14d72","#8a7431"]);
  function cleanText(value,maxLength=120){
    return String(value??"").trim().slice(0,maxLength);
  }
  function defaultProject(){
    return {
      layers:[
        {id:PRIVATE_ID,name:"Privat",color:DEFAULT_COLORS[0],visible:true},
        {id:"layer-1",name:"Ebene 1",color:DEFAULT_COLORS[1],visible:true}
      ],
      pins:[],
      viewport:{lat:48.7758,lng:9.1829,zoom:6},
      basemap:"street",esriRelief:false,labelsVisible:true,pinInfoMode:"off",pinInfoPeriod:"today",pinInfoDailyPeriod:"today",pinInfoPrecipitationPeriod:"today",pinInfoSunPeriod:"today",allowGeocode:false,geoCache:{}
    };
  }
  function position(lat,lng){
    const y=Number(lat),x=Number(lng);
    if(!Number.isFinite(y)||!Number.isFinite(x)||y < -90||y > 90||x < -180||x > 180)
      throw new RangeError("Invalid WGS84 point");
    return {lat:y,lng:x};
  }
  function pointToGeoJSON(point){
    const p=position(point.lat,point.lng);
    return {type:"Point",coordinates:[p.lng,p.lat]};
  }
  function pointFromGeoJSON(geometry){
    if(geometry?.type!=="Point"||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2)
      throw new TypeError("Expected GeoJSON Point");
    return position(geometry.coordinates[1],geometry.coordinates[0]);
  }
  function validatePinLayer(pin,layers){
    if(!pin||typeof pin!=="object"||!Array.isArray(layers))
      throw new TypeError("Invalid pin or layers");
    // A pin belongs to exactly one existing layer. Malformed assignments
    // (including legacy arrays) are rejected as invalid, not thrown as errors.
    if(typeof pin.layerId!=="string"||!pin.layerId)return false;
    return layers.some(l=>l?.id===pin.layerId);
  }
  const api=Object.freeze({
    PRIVATE_ID,DEFAULT_COLORS,cleanText,defaultProject,
    position,pointToGeoJSON,pointFromGeoJSON,validatePinLayer
  });
  root.Pin2MapProjectModel=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
