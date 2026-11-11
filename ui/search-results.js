"use strict";
/*
 * Search-results presentation only: no geocoding, pin creation, routing,
 * map engine, IndexedDB, or ownership of application search state.
 */
(function(root){
  class SearchResultsView {
    constructor({container,document:doc,onChoose,onCancel=()=>{},titleOf,detailOf,kindOf=()=>null,duplicateCoordinates=()=>[]}){
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
      this.kindOf=kindOf;
      this.duplicateCoordinates=duplicateCoordinates;
      this.onCancel=onCancel;
      // Presentation geometry only: the results sheet is attached to the
      // OUTER search block, appears below the outer block and can extend
      // to the BOTTOM baseline of the lowest map controls. No domain/state ownership.
      this.searchAnchor=doc.getElementById?.("searchForm")||null;
      this.outerSearch=this.searchAnchor?.closest?.(".topbar")||this.searchAnchor;
      this.bottomControl=doc.getElementById?.("basemapButton")||null;
      this.appRoot=doc.getElementById?.("app")||null;
      if(this.outerSearch&&root.ResizeObserver){
        this.widthObserver=new root.ResizeObserver(()=>this.syncWidth());
        this.widthObserver.observe(this.outerSearch);
        if(this.bottomControl)this.widthObserver.observe(this.bottomControl);
      }
      // Only the current view for this results container owns keyboard input.
      // No document-global shortcut may alter map or search input semantics.
      this.container.__pin2mapResultsKeyboardOwner=this;
      this.keyHandler=event=>this.handleKey(event);
      doc.addEventListener?.("keydown",this.keyHandler);
    }
    syncWidth(){
      const box=this.outerSearch?.getBoundingClientRect?.();
      if(!box||!this.container.style)return;
      const origin=this.appRoot?.getBoundingClientRect?.().top||0;
      // The predecessor's choice dialog is a separate framed panel, not
      // a visually attached drawer. Keep its top below the OUTER search block.
      const sheetTop=box.bottom-origin+8;
      const bottomEdge=this.bottomControl?.getBoundingClientRect?.().bottom;
      const appBottom=this.appRoot?.getBoundingClientRect?.().bottom;
      const limit=Number.isFinite(bottomEdge)?bottomEdge:appBottom;
      this.container.style.width=box.width+"px";
      this.container.style.top=sheetTop+"px";
      if(Number.isFinite(limit))
        this.container.style.maxHeight=Math.max(0,limit-origin-sheetTop)+"px";
      // Interior spacing belongs to the single .results-items CSS rule.
    }
    isVisible(){return !this.container.classList.contains("hidden");}
    choices(){return [...(this.container.querySelectorAll?.(".results-items .result")||[])];}
    mark(target){
      for(const button of this.choices())button.classList.toggle("is-keyboard-selected",button===target);
      if(target){
        target.focus?.({preventScroll:true});
        target.scrollIntoView?.({block:"nearest",inline:"nearest"});
      }
    }
    handleKey(event){
      if(this.container.__pin2mapResultsKeyboardOwner!==this||!this.isVisible())return;
      const key=event.key;
      if(!["ArrowDown","ArrowUp","Enter","Escape"].includes(key))return;
      const options=this.choices();
      const active=this.document.activeElement;
      const searchInput=this.document.getElementById?.("searchInput");
      // Enter in the input always remains an explicit NEW search request.
      if(key==="Enter"&&active===searchInput)return;
      if(key==="Escape"){
        event.preventDefault();
        event.stopPropagation?.();
        this.hide();
        this.onCancel();
        searchInput?.focus?.({preventScroll:true});
        return;
      }
      if(!options.length)return;
      const focused=options.indexOf(active);
      const selected=options.findIndex(el=>el.classList.contains("is-keyboard-selected"));
      const index=focused>=0?focused:selected>=0?selected:0;
      if(key==="ArrowDown"||key==="ArrowUp"){
        event.preventDefault();
        event.stopPropagation?.();
        const next=focused<0&&selected<0
          ?(key==="ArrowDown"?0:options.length-1)
          :(index+(key==="ArrowDown"?1:-1)+options.length)%options.length;
        this.mark(options[next]);
      }else if(key==="Enter"&&active!==this.container.querySelector?.(".results-cancel")){
        event.preventDefault();
        event.stopPropagation?.();
        options[index].click();
      }
    }
    hide(){
      this.container.classList.add("hidden");
      this.container.replaceChildren();
    }
    dispose(){
      this.document.removeEventListener?.("keydown",this.keyHandler);
      this.widthObserver?.disconnect?.();
      if(this.container.__pin2mapResultsKeyboardOwner===this)
        delete this.container.__pin2mapResultsKeyboardOwner;
    }
    cancelFooter(){
      const footer=this.document.createElement("div");
      footer.className="results-footer";
      const close=this.document.createElement("button");
      close.type="button";
      close.className="results-cancel";
      close.textContent="Abbrechen";
      close.addEventListener("click",()=>{this.hide();this.onCancel();});
      footer.append(close);
      return footer;
    }
    message(message){
      this.container.replaceChildren();
      const p=this.document.createElement("div");
      p.className="message";
      p.textContent=String(message);
      const items=this.document.createElement("div");
      items.className="results-items";
      items.append(p);
      this.container.append(items,this.cancelFooter());
      this.container.classList.remove("hidden");
      this.syncWidth();
    }
    show(results){
      if(!Array.isArray(results))throw new TypeError("Search results must be an array");
      this.container.replaceChildren();
      const items=this.document.createElement("div");
      items.className="results-items";
      const duplicateNotes=this.duplicateCoordinates(results);
      results.forEach((result,index)=>{
        const item=this.document.createElement("button");
        item.type="button";
        item.className="result";
        const heading=this.document.createElement("div");
        heading.className="result-heading";
        const title=this.document.createElement("strong");
        title.textContent=this.titleOf(result);
        heading.append(title);
        const kind=this.kindOf(result);
        if(kind?.label){
          const badge=this.document.createElement("span");
          badge.className="result-kind";
          badge.textContent=kind.symbol+" "+kind.label;
          heading.append(badge);
        }
        const detail=this.document.createElement("small");
        detail.textContent=this.detailOf(result);
        item.append(heading,detail);
        if(duplicateNotes[index]){
          const coords=this.document.createElement("span");
          coords.className="result-coordinates";
          coords.textContent=duplicateNotes[index];
          item.append(coords);
        }
        item.addEventListener("click",()=>this.onChoose(result));
        items.append(item);
      });
      this.container.append(items,this.cancelFooter());
      this.container.classList.remove("hidden");
      this.syncWidth();
      // Predecessor: first result is the keyboard selection on opening.
      // Avoid forcing virtual keyboards or changing touch focus.
      const first=this.choices()[0];
      if(first){
        first.classList.add("is-keyboard-selected");
        if(!root.matchMedia?.("(pointer: coarse)")?.matches)
          first.focus?.({preventScroll:true});
      }
    }
  }
  root.Pin2MapSearchResultsView=SearchResultsView;
  if(typeof module!=="undefined"&&module.exports)module.exports=SearchResultsView;
})(typeof window!=="undefined"?window:globalThis);
