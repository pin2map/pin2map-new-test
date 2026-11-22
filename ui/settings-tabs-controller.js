"use strict";
/* Settings-panel tabs and read-only version/storage information.
 * Browser APIs and the color view are injected so the settings UI
 * remains independent of persistence, service-worker and map adapters. */
(function(root){
  class SettingsTabsController{
    constructor({getElement,renderColors,versionOf,parseVersion,getWorkerController,
      getMessageChannel,fetchWorker,estimateStorage,locale="de-DE"}){
      const ports=[getElement,renderColors,versionOf,parseVersion,getWorkerController,
        getMessageChannel,fetchWorker,estimateStorage];
      if(ports.some(fn=>typeof fn!=="function"))
        throw new TypeError("Settings tabs ports required");
      Object.assign(this,{getElement,renderColors,versionOf,parseVersion,getWorkerController,
        getMessageChannel,fetchWorker,estimateStorage,locale});
      this.tabs=["General","Interface","Services","Colors"];
      this.handlers=[];this.bound=false;
    }
    async updateStorage(){
      const version=this.getElement("settingsProductVersion");
      const usage=this.getElement("settingsStorageUsage");
      version.textContent="Version wird ermittelt …";
      try{
        const worker=await this.versionOf(this.getWorkerController(),this.getMessageChannel(),1200);
        const response=worker?null:await this.fetchWorker("./sw.js?version="+Date.now(),{cache:"no-store"});
        const code=worker||(response?.ok?this.parseVersion(await response.text()):"nicht verfügbar");
        version.textContent=code.replace(/^pin2map-(?:preview|new)-v/,"v");
      }catch{version.textContent="nicht verfügbar";}
      try{
        const estimate=await this.estimateStorage();
        const caches=estimate?.usageDetails?.caches;
        const bytes=caches??estimate?.usage;
        if(!Number.isFinite(bytes)){usage.textContent="nicht verfügbar";return;}
        const unit=bytes>=1048576?" MB":" KB",divisor=bytes>=1048576?1048576:1024;
        usage.textContent="ca. "+(bytes/divisor).toLocaleString(this.locale,{maximumFractionDigits:1})+
          unit+(caches===undefined?" (gesamter lokaler Speicher)":"");
      }catch{usage.textContent="nicht verfügbar";}
    }
    select(key){
      for(const tab of this.tabs){
        const selected=key===tab;
        this.getElement("settings"+tab+"Content").classList.toggle("hidden",!selected);
        this.getElement("settings"+tab+"Tab").setAttribute("aria-selected",String(selected));
        this.getElement("settings"+tab+"Tab").tabIndex=selected?0:-1;
      }
      if(key==="Colors")this.renderColors();
      if(key==="General")void this.updateStorage();
    }
    bind(){
      if(this.bound)return;
      this.bound=true;
      const listen=(node,type,handler)=>{
        node.addEventListener(type,handler);
        this.handlers.push({node,type,handler});
      };
      for(const tab of this.tabs)
        listen(this.getElement("settings"+tab+"Tab"),"click",()=>this.select(tab));
      listen(this.getElement("settingsButton"),"click",()=>{
        if(!this.getElement("settingsPanel").classList.contains("hidden"))this.select("General");
      });
      this.select("General");
    }
    dispose(){
      for(const {node,type,handler} of this.handlers)node.removeEventListener(type,handler);
      this.handlers=[];this.bound=false;
    }
  }
  root.Pin2MapSettingsTabsController=SettingsTabsController;
  if(typeof module!=="undefined"&&module.exports)module.exports=SettingsTabsController;
})(typeof window!=="undefined"?window:globalThis);
