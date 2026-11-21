"use strict";
/* Pure, provider-specific URL construction. Never starts routing inside pin2map. */
(function(root){
 const pair=pin=>{
  if(!pin||!Number.isFinite(pin.lat)||!Number.isFinite(pin.lng)||
     Math.abs(pin.lat)>90||Math.abs(pin.lng)>180)
   throw new RangeError("Invalid WGS84 pin coordinates");
  return pin.lat.toFixed(6)+","+pin.lng.toFixed(6);
 };
 function url(mode,pin){
  const coords=encodeURIComponent(pair(pin));
  if(mode==="driving")return "https://maps.apple.com/?daddr="+coords+"&dirflg=d";
  if(mode==="satellite")return "https://maps.apple.com/?ll="+coords+"&t=k";
  throw new RangeError("Unknown Apple Maps action");
 }
 const api=Object.freeze({pair,url});
 root.Pin2MapAppleMapsLinks=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
