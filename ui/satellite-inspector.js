"use strict";
/* Ephemeral UI coordinator: no project writes or pin creation. */
(function(root){
  class SatelliteInspector{
    constructor({getElement,document:doc,mapPort,provider,onNotice=()=>{}}){
      this.getElement=getElement;this.document=doc;this.mapPort=mapPort;
      this.provider=provider;this.onNotice=onNotice;this.active=false;this.serial=0;
      this.abortController=null;this.marker=null;
    }
    get panel(){return this.getElement("satelliteInfoPanel");}
    get button(){return this.getElement("satelliteInspect");}
    isActive(){return this.active;}
    start(){
      if(this.active){this.stop();return;}
      this.active=true;this.button.setAttribute("aria-pressed","true");
      this.mapPort.setInspectionCursor?.(true);
      this.onNotice("Bildposition auf der Karte antippen");
    }
    stop(){
      this.active=false;this.serial++;
      this.abortController?.abort();this.abortController=null;
      this.mapPort.clearSatelliteSelection();this.marker=null;
      this.mapPort.setInspectionCursor?.(false);
      this.panel.classList.add("hidden");
      this.getElement("satelliteInfoFields").replaceChildren();
      this.button.setAttribute("aria-pressed","false");
    }
    async pick(position){
      if(!this.active)return false;
      this.abortController?.abort();
      const abortController=new AbortController();this.abortController=abortController;
      const serial=++this.serial;
      this.mapPort.showSatelliteSelection(position);
      this.panel.classList.remove("hidden");
      const fields=this.getElement("satelliteInfoFields");
      fields.replaceChildren();
      this.addRow(fields,"Status","Bildinformationen werden geladen …");
      try{
        const result=await this.provider.identify(position,this.mapPort.getViewport(),{signal:abortController.signal});
        if(serial!==this.serial||!this.active)return true;
        fields.replaceChildren();
        for(const field of result.fields)this.addRow(fields,field.name,field.value);
        this.addWaybackRow(fields,result.waybackUrl);
      }catch(error){
        if(serial!==this.serial||!this.active||error?.name==="AbortError")return true;
        fields.replaceChildren();
        this.addRow(fields,"Hinweis","Esri-Bildinformationen konnten nicht geladen werden");
      }
      return true;
    }
    addRow(parent,name,value){
      const row=this.document.createElement("div");row.className="satellite-info-row";
      const title=this.document.createElement("strong");title.textContent=name;
      const detail=this.document.createElement("span");detail.textContent=value;
      row.append(title,detail);parent.append(row);
    }
    addWaybackRow(parent,url){
      const row=this.document.createElement("div");row.className="satellite-info-row";
      const title=this.document.createElement("strong");title.textContent="Link zu Wayback";
      const link=this.document.createElement("a");
      link.textContent="In Wayback öffnen";
      link.href=url;link.target="_blank";link.rel="noopener noreferrer";
      row.append(title,link);parent.append(row);
    }
    bind(){
      this.button.addEventListener("click",()=>{
        if(this.button.disabled)return;
        this.start();
        this.getElement("basemapMenu").classList.add("hidden");
        this.getElement("basemapButton").setAttribute("aria-expanded","false");
      });
      this.getElement("satelliteInfoClose").addEventListener("click",()=>this.stop());
      this.document.addEventListener("keydown",e=>{if(e.key==="Escape"&&this.active)this.stop();});
    }
  }
  root.Pin2MapSatelliteInspector=SatelliteInspector;
  if(typeof module!=="undefined"&&module.exports)module.exports=SatelliteInspector;
})(typeof window!=="undefined"?window:globalThis);
