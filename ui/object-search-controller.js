"use strict";
/* Persisted-object search presentation state and map-viewport decisions.
 * Domain matching is supplied as a port; no direct Leaflet or storage access. */
(function(root){
  class ObjectSearchController{
    constructor({document,getElement,searchDomain,getProject,getSpotlight,
      getMenu,render,onFit,cancelPlace,cancelGeometry,hidePlaceResults,
      updateClear}){
      Object.assign(this,{doc:document,getElement,searchDomain,getProject,getSpotlight,
        getMenu,render,onFit,cancelPlace,cancelGeometry,hidePlaceResults,updateClear});
      this.view=null;
    }
    input(){return this.getElement("searchInput");}
    spotlight(){return this.getSpotlight();}
    reset(){
      if(!this.view)return;
      this.view=null;
      this.doc.body.classList.remove("object-search-active");
      this.render();
      this.spotlight()?.setActive(false);
      // Preserve the exact camera position.
    }
    refresh(){
      const view=this.view;
      if(!view)return;
      const matches=this.searchDomain.searchExpanded(this.getProject(),{
        query:this.input().value.trim(),...view.options
      });
      this.getMenu()?.setResults(matches);
      this.view={...view,matches,ids:new Set(matches.map(m=>m.type+":"+m.id))};
      this.doc.body.classList.toggle("object-search-active",matches.length>0);
      this.render();
      this.spotlight()?.setActive(matches.length>0&&!view.onlyHits);
      this.spotlight()?.schedule();
      // Editing a result must not move the viewport.
    }
    fit(matches){
      if(!matches.length)return;
      const project=this.getProject();
      const selected={layers:project.layers.map(l=>({...l,visible:true})),
        pins:matches.filter(m=>m.type==="pins").map(m=>m.object),
        areas:matches.filter(m=>m.type==="areas"||m.type==="lakes").map(m=>m.object),
        rivers:matches.filter(m=>m.type==="rivers").map(m=>m.object)};
      this.onFit(selected);
      this.spotlight()?.schedule();
    }
    run(options={}){
      const query=this.input().value.trim(),previous=this.view;
      const displayOnlyChanged=!!previous&&previous.query===query&&
        Object.keys(options).every(key=>key==="onlyHits"||
          options[key]===previous.options[key])&&
        previous.onlyHits!==(options.onlyHits===true);
      this.cancelPlace();this.cancelGeometry();this.hidePlaceResults();
      this.doc.body.classList.add("object-search-mode");
      const matches=this.searchDomain.searchExpanded(this.getProject(),{query,...options});
      this.getMenu()?.setResults(matches);
      this.view={includeHidden:options.includeHidden===true,
        onlyHits:options.onlyHits===true,query,
        ids:new Set(matches.map(m=>m.type+":"+m.id)),matches,options:{...options}};
      this.doc.body.classList.toggle("object-search-active",matches.length>0);
      this.render();
      this.spotlight()?.setActive(matches.length>0&&!this.view.onlyHits);
      if(!displayOnlyChanged)this.fit(matches);
    }
    end(){
      this.reset();
      this.doc.body.classList.remove("object-search-mode");
      this.input().blur();
      this.updateClear();this.hidePlaceResults();
    }
  }
  root.Pin2MapObjectSearchController=ObjectSearchController;
  if(typeof module!=="undefined"&&module.exports)module.exports=ObjectSearchController;
})(typeof window!=="undefined"?window:globalThis);
