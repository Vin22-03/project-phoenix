import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {createStore} from '../src/store.js';
let server,url,store;
before(async()=>{
 const instance=createApp(createStore({STORE_MODE:'memory'}));store=instance.store;
 server=instance.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));url='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await store?.close();});
test('health and readiness',async()=>{for(const path of ['/healthz','/readyz'])assert.equal((await fetch(url+path)).status,200);});
test('catalog',async()=>{const response=await fetch(url+'/api/products');assert.equal(response.status,200);assert.equal((await response.json()).length,6);});
test('order price is calculated by server and order is retrievable',async()=>{
 const response=await fetch(url+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{productId:1,quantity:2}],total_cents:1})});
 assert.equal(response.status,201);const order=await response.json();assert.equal(order.total_cents,9998);
 assert.equal((await (await fetch(url+'/api/orders/'+order.id)).json()).id,order.id);
});
test('bad orders rejected',async()=>{for(const items of [[],[{productId:1,quantity:0}],[{productId:999,quantity:1}],[{productId:1,quantity:1},{productId:1,quantity:2}],[null]]){const r=await fetch(url+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});assert.equal(r.status,400);}});
test('metrics exposed',async()=>{const r=await fetch(url+'/metrics');assert.equal(r.status,200);assert.match(await r.text(),/phoenix_http_request_duration_seconds/);});
test('readiness returns 503 for unavailable database',async()=>{
 const instance=createApp({mode:'postgres',ready:async()=>{throw new Error('unavailable');}});
 const s=instance.app.listen(0,'127.0.0.1');await new Promise(resolve=>s.once('listening',resolve));
 try {const base='http://127.0.0.1:'+s.address().port;assert.equal((await fetch(base+'/readyz')).status,503);assert.equal((await fetch(base+'/healthz')).status,200);}finally{await new Promise(resolve=>s.close(resolve));}
});
