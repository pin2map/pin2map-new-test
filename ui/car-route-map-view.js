"use strict";
/* Map-only route presentation via an injected renderer port. No provider calls,
 * pin mutation, Leaflet objects or persistent state cross this module boundary.
 */
(function(root){
 const COLORS=["#ff3930","#1987f5","#27a855","#fa9b22","#8754bf","#26a0a1"];
 class CarRouteMapView {
  constructor({mapPort,getPin,onLineClick,onGuideRemoveRequest=null,confirmRemove=null}){
   if(!mapPort||typeof getPin!=="function"||typeof onLineClick!=="function")
    throw new TypeError("Route map ports required");
   this.map=mapPort;this.getPin=getPin;this.onLineClick=onLineClick;this.onGuideRemoveRequest=onGuideRemoveRequest;this.confirmRemove=confirmRemove;this.handles=[];
  }
  clear(){for(const handle of this.handles)this.map.removeOverlay(handle);this.handles=[];this.map.showRouteRoles([]);}
  render(snapshot){
   this.clear();
   if(!snapshot)return;
   const roleOf=(id,kind)=>{const pin=this.getPin(id);return pin?{id,kind,lat:pin.lat,lng:pin.lng}:null;};
   const roles=[];
   if(snapshot.startId){const r=roleOf(snapshot.startId,"start");if(r)roles.push(r);}
   snapshot.waypointIds.forEach(id=>{const r=roleOf(id,"waypoint");if(r)roles.push(r);});
   if(snapshot.targetId){const r=roleOf(snapshot.targetId,"target");if(r)roles.push(r);}
   this.map.showRouteRoles(roles);
   snapshot.legs.forEach((leg,index)=>{
    const positions=leg.geometry?.coordinates?.map(([lng,lat])=>({lat,lng}));
    if(!positions||positions.length<2)return;
    const color=COLORS[index%COLORS.length];
    const line=this.map.createLine(positions,{color,weight:5,opacity:.93,bubblingMouseEvents:false});
    this.map.onRouteLine(line,()=>this.onLineClick(index));this.handles.push(line);
   });
  }
  guides(points){
   this.map.showRouteGuides(points,id=>{
    if(typeof this.onGuideRemoveRequest!=="function")return;
    if(typeof this.confirmRemove==="function"&&!this.confirmRemove("Diese Richtungsflagge entfernen?"))return;
    this.onGuideRemoveRequest(id);
   });
  }
 }
 const api=Object.freeze({CarRouteMapView,COLORS});
 root.Pin2MapCarRouteMapView=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
