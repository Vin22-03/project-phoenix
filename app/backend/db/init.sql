CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
  icon TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
  items JSONB NOT NULL
);
INSERT INTO products(id,name,category,price_cents,icon) VALUES
(1,'Wireless headphones','Audio',4999,'🎧'),
(2,'Mechanical keyboard','Workspace',7999,'⌨️'),
(3,'USB-C hub','Workspace',3499,'🔌'),
(4,'Travel backpack','Lifestyle',5999,'🎒'),
(5,'Smart desk lamp','Workspace',3999,'💡'),
(6,'Portable speaker','Audio',4499,'🔊')
ON CONFLICT(id) DO NOTHING;
