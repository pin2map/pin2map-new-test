"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
test("retired topbtn class does not return to current header or stylesheet",()=>{
  assert.doesNotMatch(css,/\.topbtn\b/);
  assert.doesNotMatch(html,/\btopbtn\b/);
  assert.match(html,/<header class="topbar">/);
  assert.match(html,/<form id="searchForm" class="search"/);
  assert.match(html,/id="searchButton"/);
});
