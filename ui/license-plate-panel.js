"use strict";
/* Transient plate-area confirmation. Never owns stored areas or renderer API. */
(function(root){
 class LicensePlatePanel{
  constructor({document:doc,getElement,mapPort,onAccept}){
   if(!doc||!mapPort||typeof getElement!=="function"||typeof onAccept!=="function")
     throw new TypeError("License plate prompt ports required");
   this.doc=doc;this.el=getElement;this.mapPort=mapPort;this.onAccept=onAccept;
   this.box=getElement("plateAreaConfirm");this.entry=null;
  }
  bind(){
   if(this.bound)return;
   this.box.replaceChildren();
   const title=this.doc.createElement("span");
   title.textContent="Bereich speichern?";this.title=title;
   const yes=this.doc.createElement("button");yes.type="button";yes.textContent="Ja";
   yes.className="plate-area-yes";
   const no=this.doc.createElement("button");no.type="button";no.textContent="Nein";
   no.className="plate-area-no";
   yes.addEventListener("click",event=>{
     event.stopPropagation();const entry=this.entry;
     this.close();if(entry)this.onAccept(entry);
   });
   no.addEventListener("click",event=>{event.stopPropagation();this.close();});
   this.box.append(title,yes,no);
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
   this.title.textContent=entry.kind==="point"?"Ersatzort als Pin speichern?":"Bereich speichern?";
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
