"use strict";
/* Country-specific administrative KIND classification. Polish 2024 law,
 * §31 + Annex 13: regional prefix + powiat, including independent urban
 * powiats. Do not claim an imported locality name is the official powiat name.
 * Code-by-code issuance status stays unknown unless independently checked.
 */
(function(root){
 const urban=new Set(("BI BL BS CB CG CT CW DB DJ DL DW EL EP ES FG FZ GD GS "+
   "KN KR KT LB LC LU LZ NE NO OP PK PKO PL PO RK RP RT RZ SB SC SG SR ST "+
   "TK WO WP WR WS ZK WA GA GSP SD SH SI SJJ SK SLR SM SO SPI SRS SW SY SZ SZO SJZ ZS ZSW").trim().split(/\s+/));
 const kinds=Object.freeze({
   PL:Object.freeze({
     source:"pl-2024-legal-structure",
     sourceUrl:"https://eli.gov.pl/api/acts/DU/2024/1709/text.html",
     classify:(code,record)=>{
       if(code.length<2||record.admin==="state")return null;
       if(urban.has(code))return {admin:"city",reviewKind:"statutory-city"};
       return {admin:"county",reviewKind:"statutory-powiat"};
     }
   })
 });
 root.Pin2MapPlateJurisdictionKinds=kinds;
 if(typeof module!=="undefined"&&module.exports)module.exports=kinds;
})(typeof window!=="undefined"?window:globalThis);
