"use strict";
/* Search-form UI orchestration; provider state and cancellation are injected. */
(function(root){
  class SearchFormController{
    constructor({getElement,search,onResults,onMessage,onInputChange=()=>{},cancelSearch=()=>{}}){
      if(typeof getElement!=="function"||typeof search!=="function"||
        typeof onResults!=="function"||typeof onMessage!=="function"||
        typeof onInputChange!=="function"||typeof cancelSearch!=="function")
        throw new TypeError("Search form callbacks required");
      this.element=getElement;
      this.search=search;
      this.onResults=onResults;
      this.onMessage=onMessage;
      this.onInputChange=onInputChange;
      this.cancelSearch=cancelSearch;
      this.onSubmit=this.submit.bind(this);
      this.onInput=this.inputChanged.bind(this);
      this.onClear=this.clearInput.bind(this);
      this.revision=0;
      this.bound=false;
    }
    bind(){
      if(this.bound)return;
      this.element("searchForm").addEventListener("submit",this.onSubmit);
      this.element("searchInput").addEventListener("input",this.onInput);
      this.element("searchClear")?.addEventListener("click",this.onClear);
      this.updateClear();
      this.bound=true;
    }
    dispose(){
      if(!this.bound)return;
      this.element("searchForm").removeEventListener("submit",this.onSubmit);
      this.element("searchInput").removeEventListener("input",this.onInput);
      this.element("searchClear")?.removeEventListener("click",this.onClear);
      this.cancel();
      this.bound=false;
    }
    cancel(){
      ++this.revision;
      this.cancelSearch();
      this.element("searchButton").disabled=false;
    }
    updateClear(){
      this.element("searchClear")?.classList.toggle("hidden",!this.element("searchInput").value);
    }
    clearInput(){
      const input=this.element("searchInput");
      if(!input.value)return;
      input.value="";
      this.inputChanged();
      input.focus();
    }
    inputChanged(){
      this.cancel();
      this.updateClear();
      this.onInputChange();
    }
    async submit(event){
      if(event)event.preventDefault();
      const query=this.element("searchInput").value.trim();
      if(!query)return;
      const revision=++this.revision;
      const button=this.element("searchButton");
      button.disabled=false;
      const result=await this.search(query,{
        onStart:()=>{
          if(revision!==this.revision)return;
          button.disabled=true;
          this.onMessage("Ort wird gesucht …");
        },
        onFinish:()=>{if(revision===this.revision)button.disabled=false;}
      });
      if(revision!==this.revision)return;
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
