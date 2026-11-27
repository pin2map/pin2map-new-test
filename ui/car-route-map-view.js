"use strict";
/* Map-only route presentation via an injected renderer port. No provider calls,
 * pin mutation, Leaflet objects or persistent state cross this module boundary.
 */
(function(root){
 const COLORS=["#ff3930","#1987f5","#27a855","#fa9b22","#8754bf","#26a0a1"];
 const routeClock=new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"});
 const TRANSIT_WALK_COLOR="#e3242b";
 const VARIANT_COLORS=Object.freeze(["#b42c73","#1462c0","#16805c"]);
 const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 const contains=(a,b)=>a.left<=b.left&&a.right>=b.right&&a.top<=b.top&&a.bottom>=b.bottom;
 function freeRouteRect({left,top,right,bottom},obstacles,width,height,fill=false){
  let candidates=[{left,top,right,bottom}];
  for(const box of obstacles){
   const pieces=candidates.flatMap(rect=>overlaps(rect,box)?[
    {...rect,right:box.left},{...rect,left:box.right},
    {...rect,bottom:box.top},{...rect,top:box.bottom}
   ]:[rect]).filter(rect=>rect.right-rect.left>32&&rect.bottom-rect.top>32);
   candidates=pieces.filter((rect,i)=>!pieces.some((other,j)=>i!==j&&contains(other,rect)&&
    (j<i||!contains(rect,other))));
  }
  const score=rect=>Math.min((rect.right-rect.left-32)/width,(rect.bottom-rect.top-32)/height);
  // Keep the route centered on the map's vertical axis when there is room.
  // Leaflet centers its bounds vertically inside the chosen free rectangle.
  const center=(left+right)/2;
  const centered=candidates.flatMap(rect=>{
   const halfWidth=Math.min(center-rect.left,rect.right-center);
   return halfWidth>16?[{...rect,left:center-halfWidth,right:center+halfWidth}]:[];
  });
  const compare=(a,b)=>score(a)-score(b)||
   Math.abs((b.top+b.bottom-top-bottom)/2)-Math.abs((a.top+a.bottom-top-bottom)/2);
  return (centered.length&&!fill?centered:[...centered,...candidates]).reduce((best,rect)=>!best||compare(rect,best)>0?rect:best,null);
 }
 class CarRouteMapView {
  constructor({mapPort,onLineClick,onGuideRemoveRequest=null,confirmRemove=null,getLayout=null,scheduleFrame=null}){
   if(!mapPort||typeof onLineClick!=="function")
    throw new TypeError("Route map ports required");
   this.map=mapPort;this.onLineClick=onLineClick;this.onGuideRemoveRequest=onGuideRemoveRequest;this.confirmRemove=confirmRemove;this.handles=[];
   this.getLayout=getLayout;this.scheduleFrame=scheduleFrame;this.coordinates=[];this.geometries=[];
   this.map.onViewportResize?.(()=>this.scheduleFit());
  }
  clear(){this.lines=[];for(const handle of this.handles)this.map.removeOverlay(handle);this.handles=[];}
  render(snapshot){
   this.clear();
   this.snapshot=snapshot;
   this.geometries=snapshot?.legs.map(leg=>leg.geometry)||[];
   const variants=snapshot?.variants||[];
   const geometries=snapshot?.legs||[];
   const previous=this.fitGeometries||[];
   const changed=geometries.length!==previous.length||geometries.some((geometry,i)=>geometry.geometry!==previous[i]?.geometry||geometry.geometryGaps!==previous[i]?.geometryGaps);
   if(changed){
    this.fitGeometries=geometries;
    this.coordinates=geometries.flatMap(leg=>[...(leg.geometry?.coordinates||[]),...(leg.geometryGaps||[]).flat()]
     .map(([lng,lat])=>({lat,lng})));
   }
   if(!snapshot)return;
   const draw=(geometry,{color,weight,opacity,ferry,walk,estimated,variant},onClick)=>{
    const positions=geometry?.coordinates?.map(([lng,lat])=>({lat,lng}));
    if(!positions||positions.length<2)return;
    const classNames=[ferry&&"p2m-ferry-leg",variant!==undefined&&"p2m-route-variant",
     variant!==undefined&&"p2m-route-variant-"+variant].filter(Boolean).join(" ");
    const line=this.map.createLine(positions,{
     color,weight,opacity,bubblingMouseEvents:false,className:classNames,
     ...(ferry||estimated?{dashArray:"8 8"}:walk?{dashArray:"1 9",lineCap:"round"}:{})
    });
    this.map.onRouteLine(line,onClick);this.handles.push(line);return line;
   };
   const chosen=snapshot.selectedVariant;
   snapshot.legs.forEach((leg,index)=>{
    const transit=snapshot.mode==="transit",walk=["WALK","FOOT"].includes(leg.mode);
    const color=transit&&walk?TRANSIT_WALK_COLOR:variants.length?VARIANT_COLORS[chosen]:COLORS[index%COLORS.length];
    const select=()=>{this.flash(index);this.onLineClick(index);};
    const style={color,weight:variants.length?7:5,opacity:.93,ferry:leg.ferry,walk,variant:variants.length?chosen:undefined};
    const line=draw(leg.geometry,style,select);
    this.lines[index]=line?[line]:[];
    for(const gap of leg.geometryGaps||[]){
     const connector=draw({coordinates:gap},{...style,estimated:true},select);
     if(connector)this.lines[index].push(connector);
    }
    const labelPath=leg.geometry?.coordinates||leg.geometryGaps?.[0];
    if(transit&&!walk&&labelPath&&this.map.createRouteLabel){
     const name=leg.line||leg.operator||"ÖPNV";
     this.handles.push(this.map.createRouteLabel(labelPath,name,
      routeClock.format(leg.start)+" – "+routeClock.format(leg.end),color,select,this.getLayout));
    }
   });
   for(const marker of snapshot.timeMarkers||[])this.handles.push(this.map.createRouteTimeMarker(marker));
   if(changed)this.scheduleFit();
  }
  scheduleFit(){
   if(!this.coordinates.length||this.fitScheduled||!this.scheduleFrame)return;
   this.fitScheduled=true;
   this.scheduleFrame(()=>{this.fitScheduled=false;this.fit();});
  }
  flash(index){for(const line of this.lines?.[index]||[])this.map.flashRouteLine?.(line);}
  fit(index=null){
   const leg=this.snapshot?.legs[index];
   const coordinates=index===null?this.coordinates:[...(this.geometries[index]?.coordinates||[]),
    ...(leg?.geometryGaps||[]).flat()].map(([lng,lat])=>({lat,lng}));
   if(!coordinates.length||!this.getLayout)return false;
   const {map,obstacles}=this.getLayout();
   let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   for(const position of coordinates){
    const {x,y}=this.map.projectAtZoom(position,0);
    minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);
   }
   const walking=this.snapshot?.mode==="transit"&&["WALK","FOOT"].includes(leg?.mode);
   const rect=freeRouteRect(map,obstacles,Math.max(maxX-minX,1e-6),Math.max(maxY-minY,1e-6),walking);
   if(rect)this.map.fitBounds(coordinates,{
    paddingTopLeft:[rect.left-map.left+16,rect.top-map.top+16],
    paddingBottomRight:[map.right-rect.right+16,map.bottom-rect.bottom+16],
    maxZoom:walking?19:16,...(walking?{fractionalZoom:true}:{}),animate:false
   });
   return true;
  }
  guides(points){
   this.map.showRouteGuides(points,id=>{
    if(typeof this.onGuideRemoveRequest!=="function")return;
    if(typeof this.confirmRemove==="function"&&!this.confirmRemove("Diese Richtungsflagge entfernen?"))return;
    this.onGuideRemoveRequest(id);
   });
  }
 }
 const api=Object.freeze({CarRouteMapView,COLORS,VARIANT_COLORS,TRANSIT_WALK_COLOR,freeRouteRect});
 root.Pin2MapCarRouteMapView=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
