"use strict";
/* Pure stored object search, independent of layer visibility and map rendering. */
(function(root){
 const text=v=>String(v??"").normalize("NFKC").toLocaleLowerCase("de");
 const TYPES=Object.freeze(["all","all-name","pins","areas","lakes","rivers","texts"]);
 function dateKey(value){
  if(typeof value!=="string"||!value.trim())return null;
  const stamp=Date.parse(value);if(!Number.isFinite(stamp))return null;
  return calendarDay(new Date(stamp));
 }
 function calendarDay(date,offset=0){
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()+offset);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 }
 function search(project,options={}){
  const {query="",kind="all",pins=true,areas=true,rivers=true,texts=true,
   track=false,link=false,note=false,includeTrack=true,includeLink=true,includeNote=true,includeHidden=true,created="any",date="",dateField="createdAt",now=null}=options;
  if(!TYPES.includes(kind))throw new TypeError("Unknown object search type");
  if(!["any","today","yesterday","date"].includes(created))throw new TypeError("Unknown creation date filter");
  if(!["createdAt","updatedAt"].includes(dateField))throw new TypeError("Unknown date field");
  if(["today","yesterday"].includes(created)&&!(now instanceof Date))throw new TypeError("Calendar clock required");
  const day=created==="today"?calendarDay(now):created==="yesterday"?calendarDay(now,-1):
   created==="date"&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:null;
  if(created==="date"&&!day)throw new TypeError("Valid calendar date required");
  const needle=text(query.trim());
  if(!needle&&!day)return [];
  const visibleLayers=new Set((project?.layers||[]).filter(layer=>layer.visible===true).map(layer=>layer.id));
  const hits=[];
  const seen=new Set();
  for(const collection of ["pins","areas","rivers"])for(const object of project?.[collection]||[]){
   if(!object||!object.id)continue;
   if(!includeHidden&&!visibleLayers.has(object.layerId))continue;
   const type=collection==="areas"?(object.kind==="lake"?"lakes":"areas"):
    collection==="rivers"?"rivers":"pins";
   const category=type==="lakes"?"areas":type;
   const hasText=Boolean(text(object.note).trim()||text(object.url).trim());
   if(kind!=="all"&&kind!==type&&!(kind==="areas"&&type==="lakes")&&!(kind==="texts"&&hasText))continue;
   if(!(category==="pins"&&pins||category==="areas"&&areas||category==="rivers"&&rivers))continue;
   const gpx=object.gpxAttachment||{};
   const hasTrack=Boolean(gpx.chains?.length||object.gpxKey||object.gpxTrackId||object.gpxFileId||object.gpxRef);
   if(track&&!hasTrack||link&&!text(object.url).trim()||note&&!text(object.note).trim())continue;
   if(!includeTrack&&hasTrack||!includeLink&&text(object.url).trim()||!includeNote&&text(object.note).trim())continue;
   if(day&&dateKey(object[dateField])!==day)continue;
   const display=value=>{const d=dateKey(value);return d?[d,d.slice(8,10)+"."+d.slice(5,7)+"."+d.slice(0,4)]:[];};
   const fields=[object.name,object.createdAt,object.updatedAt,
    ...display(object.createdAt),...display(object.updatedAt)];
   if(texts)fields.push(object.note,object.url,gpx.filename,object.gpxFilename,object.gpxName);
   if(needle&&!fields.some(v=>text(v).includes(needle)))continue;
   // Leaflet marker ownership is keyed by ID: count each displayed marker once.
   const key=type+":"+String(object.id);
   if(seen.has(key))continue;
   seen.add(key);
   hits.push({type,id:object.id,object});
  }
  return hits;
 }
 // v295: object scope and AND-combined property filters. Empty query is allowed.
 function searchExpanded(project,{query="",kind="all",track=false,link=false,note=false,
   includeHidden=false}={}){
  if(!TYPES.includes(kind))throw new TypeError("Unknown object search type");
  const needle=text(String(query).trim());
  if(!needle&&!track&&!link&&!note)return [];
  const visible=new Set((project?.layers||[]).filter(l=>l.visible===true).map(l=>l.id));
  const hits=[],seen=new Set();
  for(const collection of ["pins","areas","rivers"]){
   for(const object of project?.[collection]||[]){
    if(!object?.id)continue;
    // Identity is resolved BEFORE applying filters. Otherwise a stale
    // duplicate record can resurrect a pin whose authoritative first
    // record was edited to no longer match the active search.
    const key=collection+":"+String(object.id);
    if(seen.has(key))continue;
    seen.add(key);
    if(!includeHidden&&!visible.has(object.layerId))continue;
    const type=collection==="areas"?(object.kind==="lake"?"lakes":"areas"):collection;
    const gpx=object.gpxAttachment||{};
    const hasTrack=Boolean(gpx.chains?.length||object.gpxKey||object.gpxTrackId||
       object.gpxFileId||object.gpxRef);
    const hasNote=Boolean(text(object.note).trim()),hasLink=Boolean(text(object.url).trim());
    if(!(kind==="all"||kind==="all-name"||kind===type||kind==="areas"&&type==="lakes"||
      kind==="texts"&&(hasNote||hasLink)))continue;
    if(track&&!hasTrack||link&&!hasLink||note&&!hasNote)continue;
    const day=dateKey(object.createdAt);
    const fields=[object.name,object.createdAt,day,
      day?day.slice(8,10)+"."+day.slice(5,7)+"."+day.slice(0,4):""];
    // All-object modes explicitly distinguish name-only from name + note.
    // Other category filters retain their existing optional URL text match.
    if(kind!=="all-name")fields.push(object.note);
    if(kind!=="all"&&kind!=="all-name")fields.push(object.url);
    if(needle&&!fields.some(v=>text(v).includes(needle)))continue;
    hits.push({type,id:object.id,object});
   }
  }
  return hits;
 }
 const api=Object.freeze({search,searchExpanded,dateKey,calendarDay,TYPES});
 root.Pin2MapObjectSearch=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
