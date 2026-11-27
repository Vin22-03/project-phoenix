import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createClient} from 'redis';
import {products} from './catalog.js';

export function validateItems(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) throw new Error('Provide 1–20 items');
  const seen = new Set();
  return input.map(({productId, quantity} = {}) => {
    if (!Number.isSafeInteger(productId) || productId < 1 ||
        !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20 ||
        seen.has(productId)) throw new Error('Invalid or duplicate product or quantity');
    seen.add(productId);
    return {productId, quantity};
  });
}

export function makeOrder(items, catalog) {
  const lines = items.map(item => {
    const product = catalog.find(p => p.id === item.productId);
    if (!product) throw new Error('Unknown product');
    return {...item, name:product.name, price_cents:product.price_cents};
  });
  return {id:randomUUID(), created_at:new Date().toISOString(), status:'placed',
    total_cents:lines.reduce((sum, l) => sum + l.quantity*l.price_cents, 0), items:lines};
}

export function createStore(env = process.env) {
  const mode = env.STORE_MODE || 'memory';
  if (!['memory','postgres'].includes(mode)) throw new Error('Invalid STORE_MODE');
  if (mode === 'postgres' && !env.DATABASE_URL) throw new Error('DATABASE_URL required in postgres mode');
  const pool = mode === 'postgres' ? new pg.Pool({connectionString:env.DATABASE_URL, connectionTimeoutMillis:2500, query_timeout:3000, max:10}) : null;
  pool?.on('error', () => console.error(JSON.stringify({level:'error',event:'database_pool_error'})));
  const orders = new Map();
  const cache = env.REDIS_URL ? createClient({url:env.REDIS_URL, disableOfflineQueue:true, socket:{connectTimeout:2000, reconnectStrategy:retries=>Math.min(retries*200,3000)}}) : null;
  cache?.on('error', () => console.warn(JSON.stringify({level:'warn',event:'cache_connection_error'})));
  if (cache) cache.connect().catch(() => {});
  async function listProducts() {
    if(cache?.isReady) {
      try {const hit=await cache.get('phoenix:catalog:v1'); if(hit) return JSON.parse(hit);} catch {}
    }
    const data=pool ? (await pool.query('SELECT id,name,category,price_cents,icon FROM products ORDER BY id')).rows : products;
    if(cache?.isReady) try {await cache.set('phoenix:catalog:v1',JSON.stringify(data),{EX:15});} catch {}
    return data;
  }
  return {
    mode,
    listProducts,
    async ready() {if(pool) await pool.query('SELECT id FROM products LIMIT 1');},
    async createOrder(items) {
      // Authoritative server-side pricing; do not trust totals provided by clients.
      const catalog=pool ? (await pool.query('SELECT id,name,price_cents FROM products')).rows : products;
      const order=makeOrder(items,catalog);
      if(pool) await pool.query('INSERT INTO orders(id, created_at, status, total_cents, items) VALUES ($1,$2,$3,$4,$5)',[order.id,order.created_at,order.status,order.total_cents,JSON.stringify(order.items)]);
      else {if(orders.size>=1000) orders.delete(orders.keys().next().value); orders.set(order.id,order);}
      return order;
    },
    async getOrder(id) {return pool ? (await pool.query('SELECT * FROM orders WHERE id=$1',[id])).rows[0] : orders.get(id);},
    async close() {if(cache?.isOpen) cache.destroy(); if(pool) await pool.end();}
  };
}
