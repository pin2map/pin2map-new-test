"use strict";
/* Device GPS discovery is transient. Only an explicit Yes calls onAccept.
 * All map operations are injected ports; no Leaflet or persistence here.
 */
(function(root){
  class GpsLocationController{
    constructor({document:doc,getElement,geolocation,mapPort,onAccept,onNotice,now=()=>new Date()}){
      if(!doc||typeof getElement!=="function"||!mapPort||typeof onAccept!=="function"||typeof onNotice!=="function")
        throw new TypeError("GPS controller ports required");
      this.doc=doc;this.el=getElement;this.geolocation=geolocation;
      this.mapPort=mapPort;this.onAccept=onAccept;this.onNotice=onNotice;this.now=now;
      this.box=this.el("gpsPinPrompt");this.point=null;this.request=0;
    }
    bind(){
      if(this.bound)return;
      this.box.replaceChildren();
      const title=this.doc.createElement("span");title.textContent="Pin setzen?";
      const yes=this.doc.createElement("button");yes.type="button";yes.textContent="Ja";yes.className="gps-pin-yes";
      const no=this.doc.createElement("button");no.type="button";no.textContent="Nein";no.className="gps-pin-no";
      yes.addEventListener("click",event=>{
        event.stopPropagation();
        if(!this.point)return;
        const point=this.point;this.close();this.mapPort.clearTemporaryGpsPoint();
        const date=this.now(),pad=n=>String(n).padStart(2,"0");
        const name="GPS - "+date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+
          " "+pad(date.getHours())+":"+pad(date.getMinutes());
        this.onAccept(point,name);
      });
      no.addEventListener("click",event=>{event.stopPropagation();this.close();});
      this.box.append(title,yes,no);
      this.doc.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&!this.box.classList.contains("hidden")){event.preventDefault();this.close();}
      });
      this.doc.addEventListener("pointerdown",event=>{
        if(!this.box.classList.contains("hidden")&&!this.box.contains(event.target))this.close();
      });
      this.mapPort.on("moveend zoomend resize",()=>this.position());
      this.bound=true;
    }
    locate(){
      this.close();
      const token=++this.request;
      if(!this.geolocation||typeof this.geolocation.getCurrentPosition!=="function"){
        this.onNotice("GPS-Standortermittlung ist nicht verfügbar.");return;
      }
      this.onNotice("GPS-Standort wird ermittelt …");
      try{
        this.geolocation.getCurrentPosition(position=>{
          if(token!==this.request)return;
          const lat=Number(position?.coords?.latitude),lng=Number(position?.coords?.longitude);
          if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180){
            this.onNotice("GPS hat keine gültigen Koordinaten geliefert.");return;
          }
          this.point={lat,lng};
          const view=this.mapPort.getViewport();
          this.mapPort.setView({center:this.point,zoom:Math.max(view.zoom,15)},{animate:false});
          this.mapPort.showTemporaryGpsPoint(this.point);
          this.box.classList.remove("hidden");this.position();
        },error=>{
          if(token!==this.request)return;
          this.onNotice(error?.code===1?"Standortzugriff nicht erlaubt. Bitte die Standortberechtigung prüfen.":
            "GPS-Standort konnte nicht ermittelt werden. Bitte erneut versuchen.");
        },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
      }catch(_){this.onNotice("Standortzugriff nicht möglich. Bitte Geräteeinstellungen prüfen.");}
    }
    position(){
      if(!this.point||this.box.classList.contains("hidden"))return;
      const xy=this.mapPort.project(this.point),rect=this.mapPort.getContainer().getBoundingClientRect();
      const parent=this.el("app").getBoundingClientRect();
      const width=this.box.offsetWidth,height=this.box.offsetHeight;
      const left=rect.left-parent.left+xy.x-width/2,top=rect.top-parent.top+xy.y-height-18;
      this.box.style.left=Math.max(8,Math.min(left,parent.width-width-8))+"px";
      this.box.style.top=Math.max(8,Math.min(top,parent.height-height-8))+"px";
    }
    close(){this.box.classList.add("hidden");}
  }
  root.Pin2MapGpsLocationController=GpsLocationController;
  if(typeof module!=="undefined"&&module.exports)module.exports=GpsLocationController;
})(typeof window!=="undefined"?window:globalThis);
