"use strict";
/* Device GPS discovery is transient. onAccept stages a pink pin, not persistence.
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
      // No confirmation at discovery time: the application draws a pink
      // full pin; only tapping THAT pin may open the shared save prompt.
      this.box.classList.add("hidden");
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
          const date=this.now(),pad=n=>String(n).padStart(2,"0");
          const name="GPS - "+date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+
            " "+pad(date.getHours())+":"+pad(date.getMinutes());
          this.onAccept(this.point,name);
        },error=>{
          if(token!==this.request)return;
          this.onNotice(error?.code===1?"Standortzugriff nicht erlaubt. Bitte die Standortberechtigung prüfen.":
            "GPS-Standort konnte nicht ermittelt werden. Bitte erneut versuchen.");
        },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
      }catch(_){this.onNotice("Standortzugriff nicht möglich. Bitte Geräteeinstellungen prüfen.");}
    }
    close(){
      ++this.request; // invalidate a GPS callback from an abandoned search
      this.box.classList.add("hidden");
    }

  }
  root.Pin2MapGpsLocationController=GpsLocationController;
  if(typeof module!=="undefined"&&module.exports)module.exports=GpsLocationController;
})(typeof window!=="undefined"?window:globalThis);
