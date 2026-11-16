import test from "node:test";
import assert from "node:assert/strict";
import {formatCalendar,splitDays} from "../app.js";

test("the displayed calendar begins at year zero and uses valid day numbers",()=>{
  assert.equal(formatCalendar(0,1),"Anno 0 · Giorno 1");
  assert.equal(formatCalendar(4,365),"Anno 4 · Giorno 365");
  assert.equal(formatCalendar(-3,0),"Anno 0 · Giorno 1");
});

test("offline catch-up is divided into engine-safe batches",()=>{
  assert.deepEqual(splitDays(0),[]);
  assert.deepEqual(splitDays(3650),[3650]);
  assert.deepEqual(splitDays(9000),[3650,3650,1700]);
  assert.deepEqual(splitDays(12,5),[5,5,2]);
});
