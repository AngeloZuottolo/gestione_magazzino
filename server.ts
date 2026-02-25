import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("warehouse.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS product_types (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS brands (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    firstName TEXT,
    lastName TEXT,
    location TEXT
  );

  CREATE TABLE IF NOT EXISTS movements (
    id TEXT PRIMARY KEY,
    type TEXT,
    productName TEXT,
    brand TEXT,
    quantity INTEGER,
    isNew INTEGER,
    date TEXT,
    notes TEXT,
    supplier TEXT,
    assignee TEXT
  );
`);

const app = express();
app.use(express.json());

// API Routes
app.get("/api/product_types", (req, res) => {
  const rows = db.prepare("SELECT name FROM product_types").all();
  res.json(rows.map((r: any) => r.name));
});

app.post("/api/product_types", (req, res) => {
  const { name } = req.body;
  try {
    db.prepare("INSERT INTO product_types (name) VALUES (?)").run(name);
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Already exists" });
  }
});

app.delete("/api/product_types/:name", (req, res) => {
  db.prepare("DELETE FROM product_types WHERE name = ?").run(req.params.name);
  res.json({ success: true });
});

app.get("/api/brands", (req, res) => {
  const rows = db.prepare("SELECT name FROM brands").all();
  res.json(rows.map((r: any) => r.name));
});

app.post("/api/brands", (req, res) => {
  const { name } = req.body;
  try {
    db.prepare("INSERT INTO brands (name) VALUES (?)").run(name);
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Already exists" });
  }
});

app.delete("/api/brands/:name", (req, res) => {
  db.prepare("DELETE FROM brands WHERE name = ?").run(req.params.name);
  res.json({ success: true });
});

app.get("/api/suppliers", (req, res) => {
  const rows = db.prepare("SELECT name FROM suppliers").all();
  res.json(rows.map((r: any) => r.name));
});

app.post("/api/suppliers", (req, res) => {
  const { name } = req.body;
  try {
    db.prepare("INSERT INTO suppliers (name) VALUES (?)").run(name);
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Already exists" });
  }
});

app.delete("/api/suppliers/:name", (req, res) => {
  db.prepare("DELETE FROM suppliers WHERE name = ?").run(req.params.name);
  res.json({ success: true });
});

app.get("/api/users", (req, res) => {
  const rows = db.prepare("SELECT * FROM users").all();
  res.json(rows);
});

app.post("/api/users", (req, res) => {
  const { id, firstName, lastName, location } = req.body;
  db.prepare("INSERT INTO users (id, firstName, lastName, location) VALUES (?, ?, ?, ?)")
    .run(id, firstName, lastName, location);
  res.status(201).json({ success: true });
});

app.delete("/api/users/:id", (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/movements", (req, res) => {
  const rows = db.prepare("SELECT * FROM movements ORDER BY date DESC").all();
  res.json(rows.map((r: any) => ({ ...r, isNew: !!r.isNew })));
});

app.post("/api/movements", (req, res) => {
  const m = req.body;
  db.prepare(`
    INSERT INTO movements (id, type, productName, brand, quantity, isNew, date, notes, supplier, assignee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(m.id, m.type, m.productName, m.brand, m.quantity, m.isNew ? 1 : 0, m.date, m.notes, m.supplier, m.assignee);
  res.status(201).json({ success: true });
});

app.put("/api/movements/:id", (req, res) => {
  const m = req.body;
  db.prepare(`
    UPDATE movements 
    SET productName = ?, brand = ?, quantity = ?, isNew = ?, date = ?, notes = ?, supplier = ?, assignee = ?
    WHERE id = ?
  `).run(m.productName, m.brand, m.quantity, m.isNew ? 1 : 0, m.date, m.notes, m.supplier, m.assignee, req.params.id);
  res.json({ success: true });
});

app.delete("/api/movements/:id", (req, res) => {
  db.prepare("DELETE FROM movements WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Setup Vite or Static Files
async function init() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else if (!process.env.VERCEL) {
    // Production but not Vercel (e.g. standard VPS)
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
    
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

init();

export default app;
