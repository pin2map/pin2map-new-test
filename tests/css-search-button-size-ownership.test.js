"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
test("approved search field retains only the original 30px X; magnifier is removed",()=>{
 assert.doesNotMatch(html,/id="searchButton"/);
 assert.match(html,/id="searchClear"/);
 assert.match(css,/#app #searchClear\.search-clear\{/);
 assert.match(css,/flex:0 0 30px/);
 assert.match(css,/body\.object-search-mode #app #searchClear\.search-clear span\{[\s\S]*?background:#c92f39/);
});
