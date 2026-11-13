"use strict";
/* Pure screen-space collision reasoning and a renderer-neutral tap workflow.
 * No persistence or pin mutation. A chooser is used only if zoom cannot
 * separate the real 52x56 Leaflet icon hitboxes. */
(function(root){
  const HIT_WIDTH=52,HIT_HEIGHT=56,GAP=6;
  function overlaps(a,b,gap=0){
    return Math.abs(a.x-b.x)<HIT_WIDTH+gap &&
      Math.abs(a.y-b.y)<HIT_HEIGHT+gap;
  }
  // Spatial hash: tapping one of thousands of visible pins only probes
  // its adjacent 52x56px cells; no quadratic all-pairs scan on each tap.
  function cell(point,width,height){
    return {x:Math.floor(point.x/width),y:Math.floor(point.y/height)};
  }
  function key(x,y){return x+","+y;}
  function connectedPins(pins,chosenId,project){
    const points=pins.map(pin=>({...pin,point:project(pin)}));
    const index=points.findIndex(pin=>pin.id===chosenId);
    if(index<0)return [];
    const buckets=new Map(),locations=[];
    for(let j=0;j<points.length;j++){
      const c=cell(points[j].point,HIT_WIDTH,HIT_HEIGHT);
      const k=key(c.x,c.y);
      locations.push(k);
      if(!buckets.has(k))buckets.set(k,new Set());
      buckets.get(k).add(j);
    }
    const seen=new Set([index]),queue=[index];
    buckets.get(locations[index]).delete(index);
    for(let at=0;at<queue.length;at++){
      const current=points[queue[at]];
      const c=cell(current.point,HIT_WIDTH,HIT_HEIGHT);
      for(let x=c.x-1;x<=c.x+1;x++)for(let y=c.y-1;y<=c.y+1;y++){
        for(const j of buckets.get(key(x,y))||[]){
          if(overlaps(current.point,points[j].point)){
            seen.add(j);queue.push(j);
            // Remove discovered entries immediately: thousands of pins
            // with the same coordinates must not cause quadratic rescans.
            buckets.get(locations[j]).delete(j);
          }
        }
      }
    }
    return queue.map(i=>points[i]);
  }
  function allSeparated(pins,project,gap=GAP){
    const width=HIT_WIDTH+gap,height=HIT_HEIGHT+gap;
    const buckets=new Map();
    for(const pin of pins){
      const point=project(pin),c=cell(point,width,height);
      for(let x=c.x-1;x<=c.x+1;x++)for(let y=c.y-1;y<=c.y+1;y++){
        for(const other of buckets.get(key(x,y))||[])
          if(overlaps(point,other,gap))return false;
      }
      const k=key(c.x,c.y);
      if(!buckets.has(k))buckets.set(k,[]);
      buckets.get(k).push(point);
    }
    return true;
  }
  function zoomDecision(pins,current,max,projectAtZoom){
    const start=Math.ceil(current);
    for(let zoom=start+1;zoom<=max;zoom++){
      if(allSeparated(pins,pin=>projectAtZoom(pin,zoom)))
        return {zoom,separated:true};
    }
    return {zoom:max,separated:allSeparated(pins,pin=>projectAtZoom(pin,max))};
  }
  // Keep the entire initial collision component on screen. A second tap can
  // zoom the smaller residual component, instead of losing distant members.
  function fittingZoom(pins,current,max,projectAtZoom,size,padding=76){
    const availableWidth=Math.max(HIT_WIDTH+GAP,size.x-2*padding);
    const availableHeight=Math.max(HIT_HEIGHT+GAP,size.y-2*padding);
    let fitting=Math.floor(current);
    for(let z=Math.floor(current)+1;z<=max;z++){
      const points=pins.map(pin=>projectAtZoom(pin,z));
      const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))+HIT_WIDTH+GAP;
      const height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))+HIT_HEIGHT+GAP;
      if(width>availableWidth||height>availableHeight)break;
      fitting=z;
    }
    return fitting;
  }
  class PinOverlapZoom{
    constructor({mapPort,getPins,getMaxZoom,onSelect,onBeforeZoom,onHistoryChange=()=>{},getElement,document:doc}){
      if(!mapPort||[getPins,getMaxZoom,onSelect,onBeforeZoom,getElement].some(fn=>typeof fn!=="function")||!doc)
        throw new TypeError("Pin overlap dependencies required");
      this.map=mapPort;this.getPins=getPins;this.getMaxZoom=getMaxZoom;
      this.onSelect=onSelect;this.onBeforeZoom=onBeforeZoom;
      this.doc=doc;this.el=getElement;this.menu=null;
      this.lastViewport=null;this.onHistoryChange=onHistoryChange;
      doc.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&this.menu){event.preventDefault();this.close();}
      });
      doc.addEventListener("pointerdown",event=>{
        if(this.menu&&!this.menu.contains(event.target)&&!event.target.closest?.(".pin-icon"))
          this.close();
      });
    }
    canUndo(){return !!this.lastViewport;}
    undo(){
      if(!this.lastViewport)return false;
      this.close();const previous=this.lastViewport;
      this.lastViewport=null;this.onHistoryChange(false);
      this.map.setView(previous,{animate:false});return true;
    }
    zoomTo(center,zoom){
      const before=this.map.getViewport();
      if(zoom<=before.zoom)return false;
      this.lastViewport={center:{...before.center},zoom:before.zoom};
      this.onHistoryChange(true);
      this.map.setView({center,zoom},{animate:false});
      return true;
    }
    close(){
      if(this.menu){this.menu.remove();this.menu=null;}
    }
    showChoices(pins,anchor){
      this.close();
      const menu=this.doc.createElement("section");
      menu.className="pin-overlap-chooser";
      menu.setAttribute("role","dialog");
      menu.setAttribute("aria-label","Überlagerte Pins auswählen");
      const heading=this.doc.createElement("div");
      heading.className="pin-overlap-chooser-head";
      const title=this.doc.createElement("strong");
      title.textContent="Pin auswählen ("+pins.length+")";
      const dismiss=this.doc.createElement("button");
      dismiss.type="button";dismiss.textContent="×";
      dismiss.setAttribute("aria-label","Pin-Auswahl schließen");
      dismiss.addEventListener("click",()=>this.close());
      heading.append(title,dismiss);menu.append(heading);
      pins.forEach((pin,index)=>{
        const button=this.doc.createElement("button");
        button.type="button";button.className="pin-overlap-choice";
        button.textContent=(pin.name||"Unbenannter Pin")+" · "+(pin.layerName||"Unbekannte Ebene")+" · "+(index+1);
        button.addEventListener("click",()=>{
          this.close();this.onSelect(pin.id);
        });
        menu.append(button);
      });
      this.el("app").append(menu);
      this.menu=menu;
      const app=this.el("app").getBoundingClientRect();
      const mapRect=this.map.getContainer().getBoundingClientRect();
      const x=mapRect.left+anchor.x-app.left;
      const y=mapRect.top+anchor.y-app.top;
      const width=menu.offsetWidth,height=menu.offsetHeight;
      menu.style.left=Math.max(8,Math.min(x-width/2,app.width-width-8))+"px";
      menu.style.top=Math.max(8,Math.min(y+28,app.height-height-8))+"px";
      menu.querySelector(".pin-overlap-choice")?.focus({preventScroll:true});
    }
    handleTap(id){
      this.close();
      const pins=this.getPins();
      const group=connectedPins(pins,id,pin=>this.map.project(pin));
      if(group.length<=1){
        this.onSelect(id);
        return "selected";
      }
      const current=this.map.getViewport().zoom;
      const max=this.getMaxZoom();
      const values=group.map(pin=>this.map.project(pin));
      const mid={x:(Math.min(...values.map(p=>p.x))+Math.max(...values.map(p=>p.x)))/2,
        y:(Math.min(...values.map(p=>p.y))+Math.max(...values.map(p=>p.y)))/2};
      const center=this.map.unproject(mid);
      const identical=group.every(pin=>pin.lat===group[0].lat&&pin.lng===group[0].lng);
      this.onBeforeZoom();
      if(identical){
        // First touch at overview: bring the actual marker into view, do not
        // float a chooser over an unrelated overview map. Second touch chooses.
        if(current<max){
          this.zoomTo({lat:group[0].lat,lng:group[0].lng},max);
          return "zoomed";
        }
        this.map.setView({center:{lat:group[0].lat,lng:group[0].lng},zoom:current},{animate:false});
        this.showChoices(group,this.map.project(group[0]));
        return "choices";
      }
      const decision=zoomDecision(group,current,max,(pin,z)=>this.map.projectAtZoom(pin,z));
      const fit=fittingZoom(group,current,max,(pin,z)=>this.map.projectAtZoom(pin,z),this.map.getSize());
      const target=Math.min(decision.zoom,fit);
      if(target>current){
        this.zoomTo(center,target);
        // The original group remains in the viewport. Residual collisions
        // are resolved in a subsequent tap on the remaining subgroup.
        return "zoomed";
      }
      if(!decision.separated&&current>=max){
        this.showChoices(group,this.map.project(group.find(pin=>pin.id===id)));
        return "choices";
      }
      // No useful higher zoom can preserve this entire group on screen.
      // Keep the view and let the user choose explicitly.
      this.showChoices(group,this.map.project(group.find(pin=>pin.id===id)));
      return "choices";
    }
  }
  const api=Object.freeze({HIT_WIDTH,HIT_HEIGHT,GAP,overlaps,connectedPins,allSeparated,zoomDecision,fittingZoom,PinOverlapZoom});
  root.Pin2MapPinOverlapZoom=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
