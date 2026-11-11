"use strict";
/* Search-form UI orchestration only; the service owns network/cache rules. */
(function(root){
  class SearchFormController{
    constructor({getElement,search,onResults,onMessage}){
      if(typeof getElement!=="function"||typeof search!=="function"||
        typeof onResults!=="function"||typeof onMessage!=="function")
        throw new TypeError("Search form callbacks required");
      this.element=getElement;
      this.search=search;
      this.onResults=onResults;
      this.onMessage=onMessage;
      this.onSubmit=this.submit.bind(this);
      this.bound=false;
    }
    bind(){
      if(this.bound)return;
      this.element("searchForm").addEventListener("submit",this.onSubmit);
      this.bound=true;
    }
    dispose(){
      if(!this.bound)return;
      this.element("searchForm").removeEventListener("submit",this.onSubmit);
      this.bound=false;
    }
    async submit(event){
      if(event)event.preventDefault();
      const query=this.element("searchInput").value.trim();
      if(!query)return;
      const button=this.element("searchButton");
      button.disabled=false;
      const result=await this.search(query,{
        onStart:()=>{button.disabled=true;this.onMessage("Ort wird gesucht …");},
        onFinish:()=>{button.disabled=false;}
      });
      switch(result.kind){
        case "results":this.onResults(result.results);break;
        case "disabled":this.onMessage("Ortssuche im Test noch nicht aktiviert. Bitte in ⚙ Einstellungen nach Prüfung der Nominatim-Richtlinie aktivieren.");break;
        case "throttled":this.onMessage("Bitte kurz warten und die Suche erneut starten.");break;
        case "error":this.onMessage("Ortssuche derzeit nicht verfügbar. Bitte Verbindung prüfen und erneut suchen.");break;
        // Superseded/cancelled requests may not update the presentation.
        case "stale":break;
      }
    }
  }
  root.Pin2MapSearchFormController=SearchFormController;
  if(typeof module!=="undefined"&&module.exports)module.exports=SearchFormController;
})(typeof window!=="undefined"?window:globalThis);
