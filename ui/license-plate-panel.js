"use strict";
/* Shared transient object confirmation. Never owns stored data or Leaflet. */
(function(root){
 class LicensePlatePanel{
  constructor({document:doc,getElement,icons,mapPort,onAccept,onRemove}){
   if(!doc||!icons||typeof icons.svg!=="function"||!mapPort||typeof getElement!=="function"||typeof onAccept!=="function"||typeof onRemove!=="function")
     throw new TypeError("License plate prompt ports required");
   this.doc=doc;this.el=getElement;this.icons=icons;this.mapPort=mapPort;this.onAccept=onAccept;this.onRemove=onRemove;
   this.box=getElement("plateAreaConfirm");this.entry=null;
  }
  bind(){
   if(this.bound)return;
   this.box.replaceChildren();
   const save=this.doc.createElement("button");
   save.type="button";save.title="Speichern";save.setAttribute("aria-label","Speichern");
   save.className="plate-area-yes";save.append(this.icons.svg("check",this.doc));
   const remove=this.doc.createElement("button");
   remove.type="button";remove.title="Entfernen";remove.setAttribute("aria-label","Entfernen");
   remove.className="plate-area-no";remove.append(this.icons.svg("x",this.doc));
   save.addEventListener("click",event=>{
     event.stopPropagation();const entry=this.entry;
     const anchor=save.getBoundingClientRect();
     this.close();if(entry)this.onAccept(entry,anchor);
   });
   remove.addEventListener("click",event=>{
     event.stopPropagation();const entry=this.entry;
     this.close();if(entry)this.onRemove(entry);
   });
   this.box.append(remove,save);
   this.doc.addEventListener("keydown",event=>{
     if(event.key==="Escape"&&!this.box.classList.contains("hidden")){
       event.preventDefault();this.close();
     }
   });
   this.doc.addEventListener("pointerdown",event=>{
     if(!this.box.classList.contains("hidden")&&!this.box.contains(event.target))
       this.close();
   });
   this.mapPort.on("moveend zoomend resize",()=>this.position());
   this.bound=true;
  }
  show(entry,position){
   this.entry=entry;this.positionOnMap=position;
   this.box.classList.remove("hidden");this.position();
  }
  position(){
   if(!this.positionOnMap||this.box.classList.contains("hidden"))return;
   const map=this.mapPort.getContainer().getBoundingClientRect();
   const app=this.el("app").getBoundingClientRect();
   const screen=this.mapPort.project(this.positionOnMap);
   const w=this.box.offsetWidth,h=this.box.offsetHeight;
   const x=map.left-app.left+screen.x-w/2;
   const y=map.top-app.top+screen.y-h-17;
   this.box.style.left=Math.max(8,Math.min(x,app.width-w-8))+"px";
   this.box.style.top=Math.max(8,Math.min(y,app.height-h-8))+"px";
  }
  close(){this.box.classList.add("hidden");this.entry=null;this.positionOnMap=null;}
 }
 root.Pin2MapLicensePlatePanel=LicensePlatePanel;
 if(typeof module!=="undefined"&&module.exports)module.exports=LicensePlatePanel;
})(typeof window!=="undefined"?window:globalThis);
