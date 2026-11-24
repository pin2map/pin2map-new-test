"use strict";
/* Map-only route presentation via an injected renderer port. No provider calls,
 * pin mutation, Leaflet objects or persistent state cross this module boundary.
 */
(function(root){
 const COLORS=["#ff3930","#1987f5","#27a855","#fa9b22","#8754bf","#26a0a1"];
 class CarRouteMapView {
  constructor({mapPort,onLineClick,onGuideRemoveRequest=null,confirmRemove=null}){
   if(!mapPort||typeof onLineClick!=="function")
    throw new TypeError("Route map ports required");
   this.map=mapPort;this.onLineClick=onLineClick;this.onGuideRemoveRequest=onGuideRemoveRequest;this.confirmRemove=confirmRemove;this.handles=[];
  }
  clear(){for(const handle of this.handles)this.map.removeOverlay(handle);this.handles=[];}
  render(snapshot){
   this.clear();
   if(!snapshot)return;
   // Route roles are rendered by PinMarkerView on the existing pin handles.
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
