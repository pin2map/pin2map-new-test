"use strict";
/*
 * Search-results presentation only: no geocoding, pin creation, routing,
 * map engine, IndexedDB, or ownership of application search state.
 */
(function(root){
  class SearchResultsView {
    constructor({container,document:doc,onChoose,titleOf,detailOf}){
      if(!container||typeof container.replaceChildren!=="function")
        throw new TypeError("Search result container required");
      if(!doc||typeof doc.createElement!=="function")
        throw new TypeError("Document element factory required");
      if(typeof onChoose!=="function"||typeof titleOf!=="function"||typeof detailOf!=="function")
        throw new TypeError("Search result callbacks required");
      this.container=container;
      this.document=doc;
      this.onChoose=onChoose;
      this.titleOf=titleOf;
      this.detailOf=detailOf;
    }
    isVisible(){return !this.container.classList.contains("hidden");}
    hide(){
      this.container.classList.add("hidden");
      this.container.replaceChildren();
    }
    cancelFooter(){
      const footer=this.document.createElement("div");
      footer.className="results-footer";
      const close=this.document.createElement("button");
      close.type="button";
      close.className="results-cancel";
      close.textContent="Abbrechen";
      close.addEventListener("click",()=>this.hide());
      footer.append(close);
      return footer;
    }
    message(message){
      this.container.replaceChildren();
      const p=this.document.createElement("div");
      p.className="message";
      p.textContent=String(message);
      this.container.append(p,this.cancelFooter());
      this.container.classList.remove("hidden");
    }
    show(results){
      if(!Array.isArray(results))throw new TypeError("Search results must be an array");
      this.container.replaceChildren();
      for(const result of results){
        const item=this.document.createElement("button");
        item.type="button";
        item.className="result";
        const title=this.document.createElement("strong");
        title.textContent=this.titleOf(result);
        const detail=this.document.createElement("small");
        detail.textContent=this.detailOf(result);
        item.append(title,detail);
        item.addEventListener("click",()=>this.onChoose(result));
        this.container.append(item);
      }
      this.container.append(this.cancelFooter());
      this.container.classList.remove("hidden");
    }
  }
  root.Pin2MapSearchResultsView=SearchResultsView;
  if(typeof module!=="undefined"&&module.exports)module.exports=SearchResultsView;
})(typeof window!=="undefined"?window:globalThis);
