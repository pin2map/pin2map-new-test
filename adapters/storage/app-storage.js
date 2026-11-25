"use strict";
/* App-specific logical sizes and reset. Browser allocation and opaque tile
 * bodies are deliberately excluded from measured byte totals. */
(function(root){
  const projectFields={
    pins:"Pins und Anhänge",layers:"Ebenen",areas:"Flächen",rivers:"Flüsse",
    favorites:"Kartenfavoriten",routeGuides:"Richtungsflaggen",geoCache:"Zwischengespeicherte Ortssuche"
  };
  const deviceKeys=["pin2map-favorites-search-v1","pin2map-show-yellow-pin-hitboxes-v1"];
  const timeKey="pin2map-route-time-factors:";
  const byteLength=value=>new TextEncoder().encode(value).byteLength;
  const jsonBytes=value=>value===undefined?0:byteLength(JSON.stringify(value));
  function row(label,bytes,entries,unknown=0){return {label,bytes,entries,unknown};}
  class AppStorage{
    constructor({scope,pathname,getStorage,caches,getStore,worker,MessageChannel,BroadcastChannel,onPeerReset}){
      Object.assign(this,{scope,getStorage,caches,getStore,worker,MessageChannel});
      const directory=pathname.slice(0,pathname.lastIndexOf("/")+1);
      this.directory=directory;
      this.tileName=scope+"-viewed-osm-tiles-v1";
      this.tileMetaName=scope+"-viewed-osm-tile-metadata-v1";
      this.shellPrefix=scope==="pin2map-preview"?"pin2map-preview-v":"pin2map-new-v";
      if(BroadcastChannel){
        try{
          this.channel=new BroadcastChannel(scope+"-local-reset-v1");
          this.channel.onmessage=()=>onPeerReset();
        }catch{/* Storage transaction fencing also protects inactive tabs. */}
      }
    }
    get storage(){return this.getStorage();}
    preferenceKey(key){return key+":"+this.directory;}
    readPreference(key){
      const scoped=this.storage.getItem(this.preferenceKey(key));
      return scoped??(this.scope==="pin2map"?this.storage.getItem(key):null);
    }
    writePreference(key,value){
      const scoped=this.preferenceKey(key);
      if(value===null){
        this.storage.removeItem(scoped);
        if(this.scope==="pin2map")this.storage.removeItem(key);
      }else this.storage.setItem(scoped,value);
    }
    readTimeFactors(){
      const canonical=timeKey+this.directory;
      return this.storage.getItem(canonical)??this.storage.getItem(canonical+"index.html");
    }
    writeTimeFactors(value){this.storage.setItem(timeKey+this.directory,value);}
    preferenceEntries(){
      const keys=[...deviceKeys.map(key=>this.preferenceKey(key)),timeKey+this.directory,timeKey+this.directory+"index.html"];
      if(this.scope==="pin2map")keys.push(...deviceKeys);
      return keys.flatMap(key=>{
        const value=this.storage.getItem(key);
        return value===null?[]:[[key,value]];
      });
    }
    async cacheUsage(names,label){
      let bytes=0,entries=0,unknown=0;
      for(const name of names){
        const cache=await this.caches.open(name);
        for(const request of await cache.keys()){
          const response=await cache.match(request);
          if(!response)continue;
          entries++;
          if(response.type==="opaque"||response.type==="opaqueredirect"){unknown++;continue;}
          try{bytes+=(await response.blob()).size;}catch{unknown++;}
        }
      }
      return row(label,bytes,entries,unknown);
    }
    async inspect(){
      const store=this.getStore();
      const [project,history,names]=await Promise.all([
        store?.loadProject(),store?.loadViewHistory(),this.caches?.keys()||[]
      ]);
      const {userFields,settings}=Object.entries(project||{}).reduce((result,[key,value])=>{
        if(Object.hasOwn(projectFields,key))result.userFields[key]=value;
        else result.settings[key]=value;
        return result;
      },{userFields:{},settings:{}});
      const rows=Object.entries(projectFields).map(([key,label])=>{
        const value=userFields[key];
        return row(label,jsonBytes(value),Object.keys(value||{}).length);
      });
      const prefs=this.preferenceEntries();
      rows.push(row("Projekteinstellungen",Object.keys(settings).length?jsonBytes(settings):0,Object.keys(settings).length),
        row("Kartenverlauf",jsonBytes(history),Array.isArray(history?.entries)?history.entries.length:undefined),
        row("Geräteeinstellungen",prefs.reduce((sum,[key,value])=>sum+byteLength(key)+byteLength(value),0),prefs.length));
      const caches=await Promise.all([
        this.cacheUsage(names.filter(name=>name===this.tileName),"Besuchte Kartenkacheln"),
        this.cacheUsage(names.filter(name=>name===this.tileMetaName),"Kachel-Metadaten"),
        this.cacheUsage(names.filter(name=>name.startsWith(this.shellPrefix)&&/^\d+$/.test(name.slice(this.shellPrefix.length))),"App-Dateien für den Offline-Start")
      ]);
      return [...rows,...caches];
    }
    async resetTileCaches(){
      const worker=await this.worker();
      if(!worker||!this.MessageChannel){
        await Promise.all([this.tileName,this.tileMetaName].map(name=>this.caches?.delete(name)));
        return;
      }
      const channel=new this.MessageChannel();
      try{
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error("Karten-Cache konnte nicht zurückgesetzt werden.")),4000);
          channel.port1.onmessage=event=>{
            clearTimeout(timer);
            if(event.data?.ok)resolve();
            else reject(new Error("Karten-Cache konnte nicht zurückgesetzt werden."));
          };
          worker.postMessage({type:"RESET_VIEWED_TILES"},[channel.port2]);
        });
      }finally{channel.port1.close();}
    }
    async reset(){
      const store=this.getStore();
      if(!store)throw new Error("Projektspeicher ist nicht verfügbar.");
      await this.resetTileCaches();
      for(const [key] of this.preferenceEntries())this.storage.removeItem(key);
      await store.reset();
      this.channel?.postMessage("reset");
    }
  }
  root.Pin2MapAppStorage=AppStorage;
  if(typeof module!=="undefined"&&module.exports)module.exports=AppStorage;
})(typeof window!=="undefined"?window:globalThis);
