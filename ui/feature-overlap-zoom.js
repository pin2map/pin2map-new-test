"use strict";
/* Collision grouping for heterogeneous Leaflet markers (pins and named
 * geographic areas). Uses DOM hit rectangles only for UI decisions.
 * No project mutation, storage, geocoder or Leaflet globals.
 */
(function(root){
  const intersects=(a,b,gap=3)=>
    a.left<b.right+gap&&b.left<a.right+gap&&
    a.top<b.bottom+gap&&b.top<a.bottom+gap;
  function collides(a,b){
    return a.rects.some(x=>b.rects.some(y=>intersects(x,y)));
  }
  function connected(items,type,id){
    const start=items.findIndex(item=>item.type===type&&item.id===id);
    if(start<0)return [];
    const queue=[start],seen=new Set(queue);
    for(let index=0;index<queue.length;index++){
      const current=items[queue[index]];
      for(let next=0;next<items.length;next++){
        if(seen.has(next)||!collides(current,items[next]))continue;
        seen.add(next);queue.push(next);
      }
    }
    return queue.map(i=>items[i]);
  }
  class FeatureOverlapZoom{
    constructor({mapPort,getTargets,getMaxZoom,onSelect,onBeforeZoom=()=>{},
      onHistoryChange=()=>{},document:doc,getElement}){
      this.map=mapPort;this.getTargets=getTargets;this.getMaxZoom=getMaxZoom;
      this.onSelect=onSelect;this.onBeforeZoom=onBeforeZoom;
      this.onHistoryChange=onHistoryChange;this.doc=doc;this.el=getElement;
      this.menu=null;
      doc.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&this.menu){event.preventDefault();this.close();}
      });
      doc.addEventListener("pointerdown",event=>{
        if(this.menu&&!this.menu.contains(event.target)&&
          !event.target.closest?.(".pin-icon,.p2m-area-name-label"))
          this.close();
      });
    }
    close(){if(this.menu){this.menu.remove();this.menu=null;}}
    showChoices(group,screen){
      this.close();
      const doc=this.doc;
      const menu=doc.createElement("section");
      menu.className="pin-overlap-chooser feature-overlap-chooser";
      menu.setAttribute("role","dialog");
      menu.setAttribute("aria-label","Überlagerte Objekte auswählen");
      const heading=doc.createElement("div");
      heading.className="pin-overlap-chooser-head";
      const title=doc.createElement("strong");
      title.textContent="Objekt auswählen ("+group.length+")";
      const dismiss=doc.createElement("button");dismiss.type="button";
      dismiss.setAttribute("aria-label","Objekt-Auswahl schließen");
      dismiss.textContent="×";dismiss.addEventListener("click",()=>this.close());
      heading.append(title,dismiss);menu.append(heading);
      for(const item of group){
        const button=doc.createElement("button");button.type="button";
        button.className="pin-overlap-choice";
        const kind=item.type==="pin"?"Pin":item.kind==="lake"?"See":"Fläche";
        button.textContent=kind+": "+(item.name||"Unbenannt");
        button.addEventListener("click",()=>{
          this.close();this.onSelect(item.type,item.id);
        });
        menu.append(button);
      }
      this.el("app").append(menu);this.menu=menu;
      const app=this.el("app").getBoundingClientRect();
      const x=screen.x-app.left,y=screen.y-app.top;
      menu.style.left=Math.max(8,Math.min(x-menu.offsetWidth/2,
        app.width-menu.offsetWidth-8))+"px";
      menu.style.top=Math.max(8,Math.min(y+28,
        app.height-menu.offsetHeight-8))+"px";
      menu.querySelector(".pin-overlap-choice")?.focus({preventScroll:true});
    }
    handleTap(type,id){
      this.close();
      const group=connected(this.getTargets(),type,id);
      if(group.length<=1||!group.some(item=>item.type==="area"))return false;
      const current=this.map.getViewport().zoom,max=this.getMaxZoom();
      const anchor=group.find(item=>item.type===type&&item.id===id);
      const screen={x:(anchor.rects[0].left+anchor.rects[0].right)/2,
        y:(anchor.rects[0].top+anchor.rects[0].bottom)/2};
      this.onBeforeZoom();
      if(current<max){
        const points=group.map(item=>this.map.project(item.position));
        const center=this.map.unproject({
          x:(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2,
          y:(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2
        });
        this.map.setView({center,zoom:Math.min(max,current+3)},{animate:false});
        this.onHistoryChange();
        return true;
      }
      this.showChoices(group,screen);
      return true;
    }
  }
  const api=Object.freeze({intersects,collides,connected,FeatureOverlapZoom});
  root.Pin2MapFeatureOverlapZoom=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
