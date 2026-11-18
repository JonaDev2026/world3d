import test from "node:test";
import assert from "node:assert/strict";
import {createWorld} from "../engine.js";
import {handleWorkerMessage} from "../sim-worker.js";

test("worker initializes, advances and returns a consistent snapshot",async()=>{
  const responses=[];
  const post=message=>responses.push(message);
  const world=createWorld({seed:41001});

  await handleWorkerMessage({data:{id:1,type:"init",world,days:0}},post);
  assert.equal(responses[0].id,1);
  assert.equal(responses[0].summary.year,0);
  assert.equal(responses[0].summary.day,1);

  await handleWorkerMessage({data:{id:2,type:"advance",days:30}},post);
  assert.equal(responses[1].id,2);
  assert.equal(responses[1].advanced,30);
  assert.equal(responses[1].summary.day,31);

  await handleWorkerMessage({data:{id:3,type:"snapshot"}},post);
  assert.equal(responses[2].id,3);
  assert.equal(responses[2].world.seed,41001);
  assert.equal(responses[2].world.day,31);
});

test("worker persists the checkpoint and timing metadata through its adapter",async()=>{
  const responses=[];
  const saves=[];
  const adapter={
    saveWorld:async state=>{saves.push(structuredClone(state));},
    clearWorld:async()=>{}
  };
  await handleWorkerMessage({data:{id:1,type:"init",world:createWorld({seed:41002}),days:0}},message=>responses.push(message));
  await handleWorkerMessage({
    data:{id:2,type:"save",meta:{speed:10,paused:false,pendingDays:.5}}
  },message=>responses.push(message),adapter);

  assert.equal(responses[1].saved,true);
  assert.equal(saves.length,1);
  assert.equal(saves[0].speed,10);
  assert.equal(saves[0].paused,false);
  assert.equal(saves[0].pendingDays,.5);
  assert.ok(Number.isFinite(saves[0].lastWallTime));
  assert.equal(saves[0].seed,41002);
});

test("worker clears the saved state and rejects commands before reinitialization",async()=>{
  const responses=[];
  let cleared=false;
  const adapter={
    saveWorld:async()=>{},
    clearWorld:async()=>{cleared=true;}
  };
  const post=message=>responses.push(message);
  await handleWorkerMessage({data:{id:1,type:"init",world:createWorld({seed:41003}),days:0}},post);
  await handleWorkerMessage({data:{id:2,type:"clear"}},post,adapter);
  await handleWorkerMessage({data:{id:3,type:"snapshot"}},post,adapter);

  assert.equal(cleared,true);
  assert.equal(responses[1].cleared,true);
  assert.equal(responses[2].error,"Motore non inizializzato");
});
