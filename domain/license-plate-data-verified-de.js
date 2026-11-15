"use strict";
/* Verified present-day reissued German district codes missing from the
 * inherited historic text list. Facts only; no third-party geometry copied.
 * 2019 Bundesanzeiger reintroduction / 2023 Landtag BW register.
 */
(function(root){
 const rows=[
  ["TT","DE","Bodenseekreis (früher Tettnang)","Bodenseekreis","county","current","bw-landtag-2023"],
  ["ÜB","DE","Bodenseekreis, Ravensburg oder Sigmaringen (früher Überlingen)",
    "Bodenseekreis","county","current","bw-landtag-2023"]
 ];
 root.Pin2MapPlateDataParts=(root.Pin2MapPlateDataParts||[]).concat(rows);
 if(typeof module!=="undefined"&&module.exports)module.exports=rows;
})(typeof window!=="undefined"?window:globalThis);
