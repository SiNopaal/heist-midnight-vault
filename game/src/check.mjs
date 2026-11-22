import assert from 'node:assert/strict';
import {createWorld,movePlayer,interact,useCoin,useSmoke,clearLine,updateWorld} from './world.mjs';
const g=createWorld();assert.equal(g.player.x,88);assert.equal(clearLine(400,310,600,310),true,'glass is transparent');assert.equal(clearLine(100,130,350,130),false,'cover blocks vision');
movePlayer(g,-1,0,1,false);assert.equal(g.player.x,88,'museum edge blocks movement');
assert.equal(useCoin(g,600,400),true);assert.equal(g.coins,1);assert.equal(useCoin(g,1,1),true);assert.equal(useCoin(g,1,1),false);
assert.equal(useSmoke(g),true);assert.equal(useSmoke(g),false);
g.player.x=392;g.player.y=310;movePlayer(g,1,0,.3,true);assert.ok(g.player.x>400,'walkable glass stays exposed');g.player.x=500;g.player.y=310;assert.equal(interact(g),'loot');g.player.x=900;g.player.y=520;assert.equal(interact(g),'escape');
const caught=createWorld();caught.ended='caught';updateWorld(caught,.1);assert.equal(caught.ended,'caught');
console.log('heist checks passed');
