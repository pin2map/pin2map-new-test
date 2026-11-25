"use strict";
/* Settings-panel tabs and version, storage information and reset.
 * Browser APIs and the color view are injected so the settings UI
 * remains independent of persistence, service-worker and map adapters. */
(function(root){
  class SettingsTabsController{
    constructor({getElement,renderColors,versionOf,parseVersion,getWorkerController,
      getMessageChannel,fetchWorker,document:doc,inspectStorage,resetStorage,confirmReset,reload,locale="de-DE"}){
      const ports=[getElement,renderColors,versionOf,parseVersion,getWorkerController,
        getMessageChannel,fetchWorker,inspectStorage,resetStorage,confirmReset,reload];
      if(!doc||ports.some(fn=>typeof fn!=="function"))
        throw new TypeError("Settings tabs ports required");
      Object.assign(this,{getElement,renderColors,versionOf,parseVersion,getWorkerController,
        getMessageChannel,fetchWorker,doc,inspectStorage,resetStorage,confirmReset,reload,locale});
      this.tabs=["General","Interface","Services","Colors","Routing"];
      this.handlers=[];this.bound=false;this.storageUpdate=0;
    }
    async updateVersion(){
      const version=this.getElement("settingsProductVersion");
      version.textContent="Version wird ermittelt …";
      try{
        const worker=await this.versionOf(this.getWorkerController(),this.getMessageChannel(),1200);
        const response=worker?null:await this.fetchWorker("./sw.js?version="+Date.now(),{cache:"no-store"});
        const code=worker||(response?.ok?this.parseVersion(await response.text()):"nicht verfügbar");
        version.textContent=code.replace(/^pin2map-(?:preview|new)-v/,"v");
      }catch{version.textContent="nicht verfügbar";}
    }
    formatBytes(bytes){
      const unit=bytes>=1048576?" MiB":bytes>=1024?" KiB":" B";
      const divisor=bytes>=1048576?1048576:bytes>=1024?1024:1;
      return (bytes/divisor).toLocaleString(this.locale,{maximumFractionDigits:1})+unit;
    }
    async updateStorage(){
      const update=++this.storageUpdate;
      const usage=this.getElement("settingsStorageUsage");
      const list=this.getElement("settingsStorageDetails");
      usage.textContent="Wird ermittelt …";
      try{
        const rows=await this.inspectStorage();
        if(update!==this.storageUpdate)return;
        list.replaceChildren(...rows.map(({label,bytes,entries,unknown})=>{
          const line=this.doc.createElement("div");
          const title=this.doc.createElement("dt");
          const detail=this.doc.createElement("dd");
          title.textContent=label;
          const count=entries===undefined?"":" · "+entries.toLocaleString(this.locale);
          detail.textContent=unknown
            ?(bytes?this.formatBytes(bytes)+" · ":"")+unknown.toLocaleString(this.locale)+" ohne messbare Größe"
            :this.formatBytes(bytes)+count;
          line.append(title,detail);
          return line;
        }));
        usage.textContent="";
      }catch{
        if(update!==this.storageUpdate)return;
        list.replaceChildren();
        usage.textContent="Details derzeit nicht verfügbar.";
      }
    }
    async deleteData(){
      const button=this.getElement("settingsResetData");
      if(button.disabled||!this.confirmReset("Alle lokalen pin2map-Daten dieser App endgültig löschen? Pins, Ebenen und Einstellungen gehen verloren."))return;
      button.disabled=true;
      this.storageUpdate++;
      const status=this.getElement("settingsStorageUsage");
      status.textContent="Lokale Daten werden gelöscht …";
      try{
        await this.resetStorage();
        this.reload();
      }catch{
        status.textContent="Lokale Daten konnten nicht vollständig gelöscht werden.";
        button.disabled=false;
      }
    }
    select(key){
      for(const tab of this.tabs){
        const selected=key===tab;
        this.getElement("settings"+tab+"Content").classList.toggle("hidden",!selected);
        this.getElement("settings"+tab+"Tab").setAttribute("aria-selected",String(selected));
        this.getElement("settings"+tab+"Tab").tabIndex=selected?0:-1;
      }
      if(key==="Colors")this.renderColors();
      if(key==="General"){void this.updateVersion();void this.updateStorage();}
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
      listen(this.getElement("settingsResetData"),"click",()=>this.deleteData());
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
