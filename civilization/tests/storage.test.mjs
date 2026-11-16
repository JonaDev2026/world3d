import test from "node:test";
import assert from "node:assert/strict";
import {calculateOfflineCatchUp} from "../storage.js";

test("offline recovery converts elapsed wall time into simulated days",()=>{
  const result=calculateOfflineCatchUp({paused:false,speed:10,pendingDays:.25,lastWallTime:1000},3500);
  assert.equal(result.days,25);
  assert.ok(Math.abs(result.pendingDays-.25)<1e-9);
});

test("paused worlds do not recover elapsed time",()=>{
  const result=calculateOfflineCatchUp({paused:true,speed:30,pendingDays:.6,lastWallTime:1000},9000);
  assert.equal(result.days,0);
  assert.equal(result.pendingDays,.6);
});

test("clock rollback never advances the world",()=>{
  const result=calculateOfflineCatchUp({paused:false,speed:1,pendingDays:.4,lastWallTime:5000},1000);
  assert.equal(result.days,0);
  assert.equal(result.pendingDays,.4);
});
