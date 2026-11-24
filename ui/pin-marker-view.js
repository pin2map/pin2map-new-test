"use strict";
/*
 * Renderer-neutral presentation of pin markers and their labels.
 * Owns marker handles, label placement and visual collision suppression.
 * Does not mutate pins, layers or persistent project state.
 */
(function(root){
  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  // Visual-only badges are derived from existing pin information.
  // No additional persistent marker state or schema is introduced.
  function statusFlags(pin){
    const hasText=value=>typeof value==="string"&&value.trim().length>0;
    const hasGpx=Boolean(pin.gpxAttachment?.chains?.length||pin.gpxKey||pin.gpxTrackId||pin.gpxFileId||pin.gpxRef);
    return {note:hasText(pin.note),url:hasText(pin.url),gpx:hasGpx};
  }
  const PIN_PATH="M15 38C10 30 2 21 2 15a13 13 0 0 1 26 0c0 6-8 15-13 23Z";
  const ROUTE_COLORS=Object.freeze({start:"#ed3434",target:"#289d54",waypoint:"#efc63e"});
  // A projection of the active plan, never stored on a pin or its layer.
  function routeRoles(snapshot){
    const roles=new Map();
    if(!snapshot)return roles;
    (snapshot.waypointIds||[]).forEach((id,index)=>roles.set(id,{kind:"waypoint",number:index+1}));
    if(snapshot.startId)roles.set(snapshot.startId,{kind:"start"});
    if(snapshot.targetId)roles.set(snapshot.targetId,{kind:snapshot.targetId===snapshot.startId?"roundtrip":"target"});
    return roles;
  }
  function routeIcon(name){
    const shapes=root.Pin2MapIcons?.SHAPES||
      (typeof require==="function"?require("./lucide-icons.js").SHAPES:null);
    const nodes=shapes[name].map(([tag,attrs])=>"<"+tag+
      Object.entries(attrs).map(([key,value])=>' '+key+'="'+escapeHtml(value)+'"').join("")+"/>").join("");
    return '<g class="pin-route-symbol" data-route-icon="'+name+'" transform="translate(5 4) scale(.833333)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+nodes+'</g>';
  }
  function routeAppearance({pin,selected,routeRole}){
    const {kind,number}=routeRole;
    const split=kind==="roundtrip";
    const color=split?ROUTE_COLORS.target:ROUTE_COLORS[kind];
    const body=split
      ? '<path d="'+PIN_PATH+'" fill="'+color+'"/><path d="M15 38C10 30 2 21 2 15a13 13 0 0 1 13-13Z" fill="'+ROUTE_COLORS.start+'"/><path d="'+PIN_PATH+'" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>'
      : '<path d="'+PIN_PATH+'" fill="'+color+'" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>';
    const digits=String(number);
    const symbol=kind==="waypoint"
      ? '<text class="pin-route-symbol" x="15" y="14" dy=".35em" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-weight="700" font-size="'+Math.min(16,28/digits.length)+'">'+digits+'</text>'
      : routeIcon(split?"flag":kind==="start"?"arrow-up-right":"goal");
    return {html:'<div class="pin-marker'+(selected?' selected':'')+'" data-route-role="'+kind+'"><svg class="pin-marker-shape" viewBox="0 0 30 40" aria-hidden="true">'+body+symbol+'</svg></div>',title:pin.name||"Pin"};
  }
  function appearance({pin,color,selected,routeRole=null}){
    if(routeRole)return routeAppearance({pin,selected,routeRole});
    const flags=statusFlags(pin);
    const safeColor=/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)?color:"#3676c4";
    // Three 120-degree sectors: top-left note, top-right URL, bottom GPX.
    // Status is derived entirely from existing persisted pin fields.
    const palette=root.Pin2MapObjectStatus?.COLORS||
      (typeof require==="function"?require("./object-status.js").COLORS:null);
    const noteColor=flags.note?palette.note:palette.empty;
    const urlColor=flags.url?palette.url:palette.empty;
    const gpxColor=flags.gpx?"#8f989f":"#e8edf2";
    const html='<div class="pin-marker'+(selected?' selected':'')+'" style="color:'+safeColor+'">'
      +'<svg class="pin-marker-shape" viewBox="0 0 30 40" aria-hidden="true">'
      +'<path d="'+PIN_PATH+'" fill="currentColor" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>'
      +'<g class="pin-status-segments">'
      +'<path class="pin-sector-note" d="M15 14 8.1 18A8 8 0 0 1 15 6Z" fill="'+noteColor+'"/>'
      +'<path class="pin-sector-url" d="M15 14 15 6A8 8 0 0 1 21.9 18Z" fill="'+urlColor+'"/>'
      +'<path class="pin-sector-gpx" d="M15 14 21.9 18A8 8 0 0 1 8.1 18Z" fill="'+gpxColor+'"/>'
      +'<circle cx="15" cy="14" r="8" fill="none" stroke="#fff" stroke-width="1.1"/>'
      +'<path d="M15 14V6M15 14 8.1 18M15 14 21.9 18" stroke="#fff" stroke-width="1.05" stroke-linecap="round"/>'
      +'</g></svg></div>';
    return {html,title:pin.name||"Pin"};
  }
  // Legacy contract: permanently visible pin-name tooltip on the right,
  // without label collision suppression or special selected-label exception.
  // All Leaflet placement and content-node details stay in the map adapter.
  function layout(pins,{selectedPinId=null,labelsVisible=true,cleanText,colorsByLayer,defaultColor,routeSnapshot=null}){
    const roles=routeRoles(routeSnapshot);
    return pins.map(pin=>{
      const selected=pin.id===selectedPinId;
      const label=labelsVisible?cleanText(pin.name):"";
      const color=colorsByLayer[pin.layerId]||defaultColor;
      return {pin,appearance:appearance({pin,color,selected,routeRole:roles.get(pin.id)}),selected,label,side:"right"};
    });
  }
  class PinMarkerView{
    constructor({mapAdapter,onSelect,attachGesture,cleanText,defaultColor,getRouteSnapshot=()=>null,getInfoLabel=()=>null,formatInfo=()=>"",onInfoClick=()=>{}}){
      if(!mapAdapter||typeof onSelect!=="function"||typeof attachGesture!=="function")
        throw new TypeError("Pin marker adapter and callbacks required");
      this.map=mapAdapter;this.onSelect=onSelect;this.attachGesture=attachGesture;
      this.cleanText=cleanText;this.defaultColor=defaultColor;this.markers=new Map();
      this.getRouteSnapshot=getRouteSnapshot;this.getInfoLabel=getInfoLabel;this.formatInfo=formatInfo;this.onInfoClick=onInfoClick;
      this.relocationSourceId=null;
      this.visiblePinList=[];
    }
    visiblePins(){return this.visiblePinList;}
    hitTargets(){
      // Include the icon AND its permanent name label. Their real DOM hit
      // rectangles are what users perceive as a cluster of map objects.
      const rectangle=element=>{
        const b=element.getBoundingClientRect();
        return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};
      };
      return this.visiblePinList.flatMap(pin=>{
        const marker=this.markers.get(pin.id);
        const icon=marker&&this.map.getMarkerElement(marker);
        if(!icon)return [];
        const rects=[rectangle(icon)];
        const label=marker.getTooltip?.()?.getElement?.();
        if(label)rects.push(rectangle(label));
        return [{type:"pin",id:pin.id,name:pin.name,kind:"pin",
          position:{lat:pin.lat,lng:pin.lng},rects}];
      });
    }
    setRelocationSource(id){
      this.relocationSourceId=id||null;
      for(const [pinId,marker] of this.markers){
        this.map.getMarkerElement?.(marker)?.classList.toggle("pin-relocation-source",pinId===this.relocationSourceId);
      }
    }
    render({pins,layers,selectedPinId=null,labelsVisible=true,highlightIds=null,flashIds=null}){
      const colorsByLayer=Object.fromEntries(layers.map(l=>[l.id,l.color]));
      const placements=layout(pins,{
        selectedPinId,labelsVisible,
        cleanText:this.cleanText,colorsByLayer,defaultColor:this.defaultColor,routeSnapshot:this.getRouteSnapshot()
      });
      this.visiblePinList=placements.map(({pin})=>({
        id:pin.id,lat:pin.lat,lng:pin.lng,name:pin.name,layerId:pin.layerId,
        layerName:layers.find(layer=>layer.id===pin.layerId)?.name||"Unbekannte Ebene"
      }));
      const shown=new Set();
      for(const {pin,appearance:look,label} of placements){
        shown.add(pin.id);
        let marker=this.markers.get(pin.id);
        if(!marker){
          marker=this.map.createMarker({lat:pin.lat,lng:pin.lng},{draggable:false,autoPan:false});
          const id=pin.id; // Never capture a mutable pin or rendered list index.
          this.map.onMarker(marker,"click",()=>this.onSelect(id));
          this.markers.set(pin.id,marker);
        }
        this.map.setMarkerPosition(marker,{lat:pin.lat,lng:pin.lng});
        this.map.setMarkerPriority?.(marker,highlightIds?.has(pin.id)?1500:0);
        this.map.setMarkerAppearance(marker,look);
        this.map.setMarkerLabel(marker,label);
        this.map.setMarkerInfo?.(marker,this.formatInfo(this.getInfoLabel(pin)),()=>this.onInfoClick(pin.id));
        this.map.getMarkerElement?.(marker)?.classList.toggle("pin-relocation-source",pin.id===this.relocationSourceId);
        this.map.getMarkerElement?.(marker)?.classList.toggle("p2m-new-object-blink",!!flashIds?.has(pin.id));
        this.attachGesture(marker,pin.id);
      }
      for(const [id,marker] of this.markers){
        if(!shown.has(id)){this.map.removeOverlay(marker);this.markers.delete(id);}
      }
    }
    dispose(){
      for(const marker of this.markers.values())this.map.removeOverlay(marker);
      this.markers.clear();
      this.visiblePinList=[];
    }
  }
  const api=Object.freeze({escapeHtml,statusFlags,routeRoles,appearance,layout,PinMarkerView});
  root.Pin2MapPinMarkerView=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
