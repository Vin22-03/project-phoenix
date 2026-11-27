import {createApp} from './app.js';
const {app,store}=createApp();
const server=app.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(JSON.stringify({level:'info',event:'server_started',store:store.mode,port:server.address().port})));
let closing=false;
function stop(){
 if(closing)return;closing=true;
 const timeout=setTimeout(()=>process.exit(1),10000);timeout.unref();
 server.close(async()=>{try{await store.close();clearTimeout(timeout);process.exit(0);}catch{process.exit(1);}});
}
process.on('SIGTERM',stop);
process.on('SIGINT',stop);
