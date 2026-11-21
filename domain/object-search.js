"use strict";
/* Pure stored object search, independent of layer visibility and map rendering. */
(function(root){
 const text=v=>String(v??"").normalize("NFKC").toLocaleLowerCase("de");
 const TYPES=Object.freeze(["all","pins","areas","lakes","rivers","texts"]);
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
 // Contract v294: a match in ANY enabled field is sufficient. GPX mode
 // ignores the search text, but obeys the visibility checkbox.
 function searchExpanded(project,{query="",notes=false,urls=false,includeHidden=false,gpxOnly=false}={}){
  const needle=text(String(query).trim());
  if(!needle&&!gpxOnly)return [];
  const visibleLayers=new Set((project?.layers||[]).filter(l=>l.visible===true).map(l=>l.id));
  const hits=[],seen=new Set();
  for(const collection of ["pins","areas","rivers"]){
   for(const object of project?.[collection]||[]){
    if(!object?.id)continue;
    if(!includeHidden&&!visibleLayers.has(object.layerId))continue;
    const type=collection==="areas"?(object.kind==="lake"?"lakes":"areas"):collection;
    const key=type+":"+object.id;
    if(seen.has(key))continue;
    const gpx=object.gpxAttachment||{};
    const hasTrack=Boolean(gpx.chains?.length||object.gpxKey||object.gpxTrackId||
     object.gpxFileId||object.gpxRef);
    if(gpxOnly){
     if(type!=="pins"||!hasTrack)continue;
    }else{
     const day=dateKey(object.createdAt);
     const fields=[object.name,object.createdAt,day,
      day?day.slice(8,10)+"."+day.slice(5,7)+"."+day.slice(0,4):""];
     if(notes)fields.push(object.note);
     if(urls)fields.push(object.url);
     if(!fields.some(value=>text(value).includes(needle)))continue;
    }
    seen.add(key);hits.push({type,id:object.id,object});
   }
  }
  return hits;
 }
 const api=Object.freeze({search,searchExpanded,dateKey,calendarDay,TYPES});
 root.Pin2MapObjectSearch=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
