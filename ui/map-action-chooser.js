"use strict";
/* Small position-anchored action chooser for right-click and longpress.
 * Consumes a normalized WGS84 point. It never creates pins or queries OSM.
 */
(function(root){
  class MapActionChooser{
    constructor({document:doc,getElement,icons,onZoom,onZoomOut,onPin,onArea}){
      this.doc=doc;this.el=getElement;this.icons=icons;
      this.onZoom=onZoom;this.onZoomOut=onZoomOut;
      this.onPin=onPin;this.onArea=onArea;
      this.box=this.el("mapActionChooser");
      this.point=null;
    }
    bind(){
      if(this.bound)return;
      const b=this.box;
      b.replaceChildren();
      const rows=[
        ["zoom-in","Heranzoomen",()=>this.onZoom(this.point)],
        ["map-pin-plus-inside","Pin setzen",()=>this.onPin(this.point)],
        ["scan-search","Gebiet suchen",()=>this.onArea(this.point)],
        ["zoom-out","Herauszoomen",()=>this.onZoomOut(this.point)]
      ];
      for(const [icon,label,action] of rows){
        const button=this.doc.createElement("button");
        button.type="button";button.title=label;button.setAttribute("aria-label",label);
        // Icon-only, but retain accessible text via title and aria-label.
        button.append(this.icons.svg(icon,this.doc));
        button.addEventListener("click",e=>{e.stopPropagation();this.close();action();});
        b.append(button);
      }
      this.doc.addEventListener("keydown",e=>{
        if(e.key==="Escape"&&!b.classList.contains("hidden")){e.preventDefault();this.close();}
      });
      this.doc.addEventListener("pointerdown",e=>{
        if(!b.classList.contains("hidden")&&!b.contains(e.target))this.close();
      });
      this.bound=true;
    }
    open(point,screen){
      this.point=point;
      this.box.classList.remove("hidden");
      // Place beside the actual click, then clamp to the visible viewport.
      const width=this.box.offsetWidth,height=this.box.offsetHeight;
      const win=this.doc.defaultView;
      this.box.style.left=Math.max(8,Math.min(screen.x+12,win.innerWidth-width-8))+"px";
      this.box.style.top=Math.max(8,Math.min(screen.y-6,win.innerHeight-height-8))+"px";
    }
    close(){this.box.classList.add("hidden");}
  }
  root.Pin2MapMapActionChooser=MapActionChooser;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapActionChooser;
})(typeof window!=="undefined"?window:globalThis);
