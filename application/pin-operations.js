"use strict";
/*
 * Synchronous pin use-cases. Ownership: domain data only; no UI, Leaflet,
 * browser storage, or networking. Project is explicitly passed in.
 * Preserve the existing in-place mutations until a separately tested
 * immutable/project-event migration is approved.
 */
(function(root){
 function findPin(project,id){return project.pins.find(pin=>pin.id===id)||null;}
 function layerExists(project,id){return project.layers.some(layer=>layer.id===id);}
 function renamePin(project,id,name,{cleanText}){
   const pin=findPin(project,id);
   if(!pin)return null;
   pin.name=cleanText(name);
   pin.updatedAt=new Date().toISOString();
   return pin;
 }
 function assignLayer(project,id,layerId){
   const pin=findPin(project,id);
   if(!pin||!layerExists(project,layerId))return null;
   pin.layerId=layerId;
   pin.updatedAt=new Date().toISOString();
   return pin;
 }
 function movePin(project,id,position,{validatePosition}){
   const pin=findPin(project,id);
   if(!pin)return null;
   const next=validatePosition(position.lat,position.lng);
   pin.lat=next.lat;pin.lng=next.lng;
   pin.updatedAt=new Date().toISOString();
   return pin;
 }
 function createPin(project,{id,lat,lng,name="",layerId="private"},{validatePosition,cleanText}){
   if(!id||project.pins.some(p=>p.id===id))throw new Error("Duplicate or empty pin ID");
   if(!layerExists(project,layerId))throw new Error("Pin layer does not exist");
   const point=validatePosition(lat,lng);
   const pin={id,lat:point.lat,lng:point.lng,name:cleanText(name),layerId,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),note:"",url:""};
   project.pins.push(pin);
   return pin;
 }
 function updateDetails(project,id,changes,{now=()=>new Date().toISOString()}={}){
   const pin=findPin(project,id);
   if(!pin)return null;
   for(const key of ["note","url"]){
     if(Object.hasOwn(changes,key))pin[key]=String(changes[key]??"");
   }
   pin.updatedAt=now();
   return pin;
 }
 function deletePin(project,id){
   const count=project.pins.length;
   project.pins=project.pins.filter(pin=>pin.id!==id);
   return count!==project.pins.length;
 }
 const api=Object.freeze({findPin,createPin,renamePin,assignLayer,movePin,updateDetails,deletePin});
 root.Pin2MapPinOperations=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
