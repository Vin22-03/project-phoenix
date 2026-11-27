import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
async function api(path,options){const r=await fetch(path,options);if(!r.ok)throw new Error('Service response: '+r.status);return r.json();}
function App(){
 const [products,setProducts]=useState([]),[cart,setCart]=useState({}),[error,setError]=useState(''),[loading,setLoading]=useState(true),[order,setOrder]=useState(null),[busy,setBusy]=useState(false);
 function load(){setLoading(true);setError('');api('/api/products').then(setProducts).catch(e=>setError(e.message)).finally(()=>setLoading(false));}
 useEffect(load,[]);
 const items=products.filter(p=>cart[p.id]>0);
 const total=items.reduce((sum,p)=>sum+p.price_cents*cart[p.id],0);
 function adjust(id,n){setCart(c=>({...c,[id]:Math.max(0,Math.min(20,(c[id]||0)+n))}));}
 async function checkout(){setBusy(true);setError('');setOrder(null);try{const result=await api('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items.map(p=>({productId:p.id,quantity:cart[p.id]}))})});setOrder(result);setCart({});}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <><header><div className="brand">PHOENIX<span>CART</span><small>Engineering sandbox</small></div><div className="pill">Synthetic orders only</div></header><main><section className="hero"><div className="eyebrow">PROJECT PHOENIX / RELEASE 0.1</div><h1>Everyday gear.<br/>Built to scale.</h1><p>Explore our sample catalog, build an order and exercise a real API. No payments or personal information.</p></section>{error&&<div role="alert" className="error">{error} <button onClick={load}>Retry catalog</button></div>}{order&&<div role="status" className="success">Order placed · {money(order.total_cents)} · {order.id}</div>}<div className="layout"><section><h2>Catalog</h2>{loading?<p>Loading catalog…</p>:<div className="products">{products.map(p=><article key={p.id}><div className="art">{p.icon}</div><small>{p.category}</small><h3>{p.name}</h3><div className="productFooter"><b>{money(p.price_cents)}</b><button onClick={()=>adjust(p.id,1)}>Add +</button></div></article>)}</div>}</section><aside><h2>Your cart</h2>{items.length===0?<p>Cart is empty.</p>:items.map(p=><div className="line" key={p.id}><div>{p.name}<small>{money(p.price_cents*cart[p.id])}</small></div><div><button onClick={()=>adjust(p.id,-1)}>−</button> {cart[p.id]} <button onClick={()=>adjust(p.id,1)}>+</button></div></div>)}<div className="total">Total <strong>{money(total)}</strong></div><button className="checkout" disabled={!items.length||busy} onClick={checkout}>{busy?'Submitting…':'Place demo order'}</button></aside></div></main><footer>PHOENIXCART · DEVOPS LEARNING ENVIRONMENT</footer></>;
}
createRoot(document.getElementById('root')).render(<App/>);
