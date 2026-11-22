"use strict";
/* Map favorites interaction orchestration. The project favorite rules remain
 * in application/map-favorites.js; Leaflet and persistence are accessed only
 * through injected ports. The panel owns rendering, focus and confirmations. */
(function(root){
  class MapFavoritesController{
    constructor({document:doc,getElement,icons,Panel,favorites,getProject,getVisiblePins,
      mapPort,onSave,onRenderProject,onStopSatellite,onSetBasemap,onFlushHistory,
      onPersistViewport,onBeforeOpen,getSearch,onSearchChange,now=()=>new Date()}){
      const callbacks=[getElement,getProject,getVisiblePins,onSave,onRenderProject,
        onStopSatellite,onSetBasemap,onFlushHistory,onPersistViewport,onBeforeOpen,
        getSearch,onSearchChange,now];
      if(!doc||!icons||typeof Panel!=="function"||!favorites||!mapPort||
        callbacks.some(fn=>typeof fn!=="function"))
        throw new TypeError("Map favorites controller ports required");
      Object.assign(this,{doc,getElement,icons,Panel,favorites,getProject,getVisiblePins,
        mapPort,onSave,onRenderProject,onStopSatellite,onSetBasemap,onFlushHistory,
        onPersistViewport,onBeforeOpen,getSearch,onSearchChange,now});
      this.panel=null;this.listeners=[];
    }
    current(){return this.favorites.items(this.getProject()).slice(0,this.favorites.ACTIVE_CAPACITY);}
    message(value){this.getElement("favoritesMessage").textContent=value;}
    sync(){this.panel?.render(this.current());}
    suggestedName(){
      const size=this.mapPort.getSize(),middle={x:size.x/2,y:size.y/2};
      let nearest=null,best=Infinity;
      for(const pin of this.getVisiblePins()){
        const point=this.mapPort.project(pin);
        if(point.x<0||point.y<0||point.x>size.x||point.y>size.y)continue;
        const dist=(point.x-middle.x)**2+(point.y-middle.y)**2;
        if(dist<best){nearest=pin;best=dist;}
      }
      return nearest?.name?.trim()||"Unbekannt "+this.now().toISOString().slice(0,10);
    }
    add(name){
      const project=this.getProject();
      const letter=this.favorites.append(project,this.mapPort.getViewport(),project.layers,
        this.now().toISOString(),name,project.basemap);
      if(!letter){this.message("Maximale Anzahl von 500 Favoriten erreicht.");return;}
      this.onSave();this.sync();this.message("Favorit gespeichert.");
    }
    replace(index,name){
      const project=this.getProject();
      if(this.favorites.replace(project,index,this.mapPort.getViewport(),project.layers,
        this.now().toISOString(),name,project.basemap)){
        this.onSave();this.sync();this.message("Favorit ersetzt.");
      }
    }
    rename(index,name){
      if(this.favorites.rename(this.getProject(),index,name)){
        this.onSave();this.sync();this.message("Favorit umbenannt.");
      }
    }
    remove(index){
      if(this.favorites.remove(this.getProject(),index)){
        this.onSave();this.sync();
        this.message("Favorit entfernt. Die Liste wurde lückenlos neu geordnet.");
      }
    }
    removeAll(){
      if(this.favorites.removeAll(this.getProject())){
        this.onSave();this.sync();this.message("Alle Favoriten gelöscht.");
      }
    }
    reorder(from,to){
      if(!this.favorites.reorder(this.getProject(),from,to))return;
      this.onSave();this.sync();
    }
    choose(index){
      const project=this.getProject();
      const viewport=this.favorites.apply(project,index);
      if(!viewport)return;
      const favorite=project.favorites[index];
      if(favorite?.basemap&&["street","topo","international","satellite","humanitarian"].includes(favorite.basemap)
        &&project.basemap!==favorite.basemap){
        this.onStopSatellite();project.basemap=favorite.basemap;this.onSetBasemap();
      }
      this.onSave();this.onRenderProject();
      this.panel.close();
      this.message("");
      // Preserve the prior view even if gesture coalescing is still pending.
      this.onFlushHistory();
      this.mapPort.setView(viewport,{animate:false});
      this.onPersistViewport();
    }
    bind(){
      if(this.panel)return this.panel;
      this.panel=new this.Panel({
        document:this.doc,getElement:this.getElement,icons:this.icons,
        onOpen:()=>{this.onBeforeOpen();this.message("");},
        onAdd:name=>this.add(name),onReplace:(index,name)=>this.replace(index,name),
        onRename:(index,name)=>this.rename(index,name),
        onRemove:index=>this.remove(index),onRemoveAll:()=>this.removeAll(),
        onReorder:(from,to)=>this.reorder(from,to),onChoose:index=>this.choose(index),
        suggestName:()=>this.suggestedName(),capacity:this.favorites.ACTIVE_CAPACITY,
        getSearch:this.getSearch,onSearchChange:this.onSearchChange
      });
      this.icons.mount(this.getElement("favoritesButton"),"star");
      const favoriteAdd=this.getElement("favoritesAdd");
      favoriteAdd.replaceChildren(this.icons.svg("plus",this.doc),
        this.doc.createTextNode("Ansicht hinzufügen"));
      const listen=(node,type,handler)=>{
        node.addEventListener(type,handler);
        this.listeners.push({node,type,handler});
      };
      listen(this.getElement("favoritesButton"),"click",()=>this.panel.toggle(this.current()));
      for(const id of ["favoritesClose","favoritesCloseBottom"])
        listen(this.getElement(id),"click",()=>this.panel.close());
      listen(favoriteAdd,"click",()=>{
        if(favoriteAdd.disabled)return;
        this.message("");this.panel.start("new");
      });
      listen(this.doc,"pointerdown",event=>{
        if(this.panel.open&&!event.target.closest("#favoritesPanel,#favoritesButton"))
          this.panel.close();
      });
      listen(this.doc,"keydown",event=>{
        if(event.key==="Escape"&&this.panel.open){event.preventDefault();this.panel.close();}
      });
      return this.panel;
    }
    dispose(){
      for(const {node,type,handler} of this.listeners)node.removeEventListener(type,handler);
      this.listeners=[];
      // No dialog-state mutation here; the composition root owns lifecycle.
    }
  }
  root.Pin2MapMapFavoritesController=MapFavoritesController;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapFavoritesController;
})(typeof window!=="undefined"?window:globalThis);
