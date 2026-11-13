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
    const buckets=new Map();
    for(let j=0;j<points.length;j++){
      const c=cell(points[j].point,HIT_WIDTH,HIT_HEIGHT);
      const k=key(c.x,c.y);
      if(!buckets.has(k))buckets.set(k,[]);
      buckets.get(k).push(j);
    }
    const seen=new Set([index]),queue=[index];
    for(let at=0;at<queue.length;at++){
      const current=points[queue[at]];
      const c=cell(current.point,HIT_WIDTH,HIT_HEIGHT);
      for(let x=c.x-1;x<=c.x+1;x++)for(let y=c.y-1;y<=c.y+1;y++){
        for(const j of buckets.get(key(x,y))||[]){
          if(!seen.has(j)&&overlaps(current.point,points[j].point)){
            seen.add(j);queue.push(j);
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
  class PinOverlapZoom{
    constructor({mapPort,getPins,getMaxZoom,onSelect,onBeforeZoom,getElement,document:doc}){
      if(!mapPort||[getPins,getMaxZoom,onSelect,onBeforeZoom,getElement].some(fn=>typeof fn!=="function")||!doc)
        throw new TypeError("Pin overlap dependencies required");
      this.map=mapPort;this.getPins=getPins;this.getMaxZoom=getMaxZoom;
      this.onSelect=onSelect;this.onBeforeZoom=onBeforeZoom;
      this.doc=doc;this.el=getElement;this.menu=null;
      doc.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&this.menu){event.preventDefault();this.close();}
      });
      doc.addEventListener("pointerdown",event=>{
        if(this.menu&&!this.menu.contains(event.target)&&!event.target.closest?.(".pin-icon"))
          this.close();
      });
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
        button.textContent=(pin.name||"Unbenannter Pin")+" · "+(index+1);
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
      const choice=zoomDecision(group,current,max,(pin,zoom)=>this.map.projectAtZoom(pin,zoom));
      const values=group.map(pin=>this.map.project(pin));
      const mid={x:(Math.min(...values.map(p=>p.x))+Math.max(...values.map(p=>p.x)))/2,
        y:(Math.min(...values.map(p=>p.y))+Math.max(...values.map(p=>p.y)))/2};
      this.onBeforeZoom();
      if(choice.zoom>current){
        const center=this.map.unproject(mid);
        this.map.setView({center,zoom:choice.zoom},{animate:false});
      }
      // When the provider's maximum zoom cannot disentangle a cluster,
      // provide explicit safe selection instead of picking the topmost pin.
      if(!choice.separated){
        const where=this.map.project(group.find(pin=>pin.id===id));
        this.showChoices(group,where);
        return "choices";
      }
      return "zoomed";
    }
  }
  const api=Object.freeze({HIT_WIDTH,HIT_HEIGHT,GAP,overlaps,connectedPins,allSeparated,zoomDecision,PinOverlapZoom});
  root.Pin2MapPinOverlapZoom=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
