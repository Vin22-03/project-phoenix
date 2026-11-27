import express from 'express';
import {randomUUID} from 'node:crypto';
import {Registry, collectDefaultMetrics, Histogram, Counter} from 'prom-client';
import {createStore, validateItems} from './store.js';

export function createApp(store = createStore()) {
  const app=express();
  const registry=new Registry();
  collectDefaultMetrics({register:registry,prefix:'phoenix_'});
  const duration=new Histogram({name:'phoenix_http_request_duration_seconds',help:'HTTP request duration',labelNames:['method','route','status'],registers:[registry],buckets:[0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]});
  const orderCount=new Counter({name:'phoenix_orders_total',help:'Successfully created synthetic orders',registers:[registry]});
  app.disable('x-powered-by');
  app.use((req,res,next)=>{
    const start=process.hrtime.bigint(), requestId=randomUUID();
    res.set('X-Request-ID',requestId);
    res.on('finish',()=>{
      const elapsed=Number(process.hrtime.bigint()-start)/1e9;
      const route=req.route?.path || 'unmatched';
      if(route!=='/metrics') duration.observe({method:req.method,route,status:String(res.statusCode)},elapsed);
      console.log(JSON.stringify({level:res.statusCode>=500?'error':'info',event:'http_request',request_id:requestId,method:req.method,route,status:res.statusCode,duration_ms:Math.round(elapsed*1000),timestamp:new Date().toISOString()}));
    });
    next();
  });
  app.use(express.json({limit:'16kb'}));
  app.get('/healthz',(_req,res)=>res.json({status:'ok'}));
  app.get('/readyz',async(_req,res)=>{
    try {await store.ready();res.json({status:'ready',store:store.mode});}
    catch {res.status(503).json({status:'not_ready'});}
  });
  app.get('/metrics',async(_req,res)=>{res.set('Content-Type',registry.contentType).send(await registry.metrics());});
  app.get('/api/products',async(_req,res)=>res.json(await store.listProducts()));
  app.post('/api/orders',async(req,res)=>{
    let items;
    try {items=validateItems(req.body?.items);}
    catch {return res.status(400).json({error:'Invalid order items'});}
    try {const order=await store.createOrder(items);orderCount.inc();res.status(201).json(order);}
    catch(err){if(err.message==='Unknown product')return res.status(400).json({error:'Unknown product'});throw err;}
  });
  app.get('/api/orders/:id',async(req,res)=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id))return res.status(400).json({error:'Invalid order ID'});
    const order=await store.getOrder(req.params.id);
    return order?res.json(order):res.status(404).json({error:'Order not found'});
  });
  app.use((_req,res)=>res.status(404).json({error:'Not found'}));
  app.use((err,_req,res,_next)=>{
    if(err.status===400 || err.status===413)return res.status(err.status).json({error:'Invalid request body'});
    console.error(JSON.stringify({level:'error',event:'request_failed',error_type:err.name}));
    res.status(500).json({error:'Internal service error'});
  });
  return {app,store};
}
