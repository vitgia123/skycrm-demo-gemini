import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Proxy db calls to ensure we always get the initialized instance (useful for Serverless)
const db = {
  get: async (sql: string, ...params: any[]) => (await getDb()).get(sql, ...params),
  all: async (sql: string, ...params: any[]) => (await getDb()).all(sql, ...params),
  run: async (sql: string, ...params: any[]) => (await getDb()).run(sql, ...params),
};

  // Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes

  // Auth: Login
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
      if (!user) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      
      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;
      userWithoutPassword.assignedTours = JSON.parse(userWithoutPassword.assignedTours || '[]');
      
      res.json({ token, user: userWithoutPassword });
    } catch (err: any) {
      console.error("Login Error:", err);
      res.status(500).json({ error: `Lỗi Server: ${err.message}` });
    }
  });

  // Auth: Get current user
  app.get("/api/me", authenticateToken, async (req: any, res: any) => {
    try {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const { password: _, ...userWithoutPassword } = user;
      userWithoutPassword.assignedTours = JSON.parse(userWithoutPassword.assignedTours || '[]');
      res.json(userWithoutPassword);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Users: Get all users
  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      const users = await db.all('SELECT id, username, name, email, role, assignedTours FROM users');
      const parsedUsers = users.map(u => ({ ...u, assignedTours: JSON.parse(u.assignedTours || '[]') }));
      res.json(parsedUsers);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Users: Create user (Admin only)
  app.post("/api/users", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const { username, password, name, email, role, assignedTours } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = `user_${Date.now()}`;
      await db.run(
        'INSERT INTO users (id, username, password, name, email, role, assignedTours) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, username.trim().toLowerCase(), hashedPassword, name, email, role, JSON.stringify(assignedTours || [])]
      );
      res.status(201).json({ id, username, name, email, role, assignedTours });
    } catch (err) {
      res.status(500).json({ error: "Server error or username exists" });
    }
  });

  // Leads: Get all leads
  app.get("/api/leads", authenticateToken, async (req, res) => {
    try {
      const leads = await db.all('SELECT * FROM leads ORDER BY createdAt DESC');
      res.json(leads);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Leads: Create lead
  app.post("/api/leads", authenticateToken, async (req, res) => {
    const lead = req.body;
    const id = Date.now().toString();
    const now = new Date().toISOString();
    try {
      await db.run(
        `INSERT INTO leads (
          id, customerName, phoneNumber, dob, tourInterest, tourPrice, discountPrice, 
          amountCollected, paymentDueDate, documentStatus, documentDueDate, source, status, resaleCount, notes, 
          assignedTo, createdAt, updatedAt, expectedProfit, actualProfit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, lead.customerName, lead.phoneNumber, lead.dob, lead.tourInterest, lead.tourPrice, lead.discountPrice,
          lead.amountCollected, lead.paymentDueDate, lead.documentStatus, lead.documentDueDate, lead.source, lead.status, lead.resaleCount || 0, lead.notes,
          lead.assignedTo, now, now, lead.expectedProfit, lead.actualProfit
        ]
      );
      const newLead = await db.get('SELECT * FROM leads WHERE id = ?', [id]);
      res.status(201).json(newLead);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Leads: Update lead
  app.put("/api/leads/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    try {
      // Build dynamic update query
      const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt');
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => updates[f]);
      
      await db.run(`UPDATE leads SET ${setClause}, updatedAt = ? WHERE id = ?`, [...values, now, id]);
      const updatedLead = await db.get('SELECT * FROM leads WHERE id = ?', [id]);
      res.json(updatedLead);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Tours: Get all
  app.get("/api/tours", authenticateToken, async (req, res) => {
    try {
      const tours = await db.all('SELECT * FROM tours ORDER BY createdAt DESC');
      res.json(tours);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Tours: Create
  app.post("/api/tours", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, description, price } = req.body;
    try {
      const id = `tour_${Date.now()}`;
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO tours (id, name, description, price, createdAt) VALUES (?, ?, ?, ?, ?)',
        [id, name, description, price || 0, now]
      );
      const newTour = await db.get('SELECT * FROM tours WHERE id = ?', [id]);
      res.json(newTour);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Tours: Delete
  app.delete("/api/tours/:id", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      await db.run('DELETE FROM tours WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Tour Costs: Get all
  app.get("/api/tour-costs", authenticateToken, async (req, res) => {
    try {
      const costs = await db.all('SELECT * FROM tour_costs');
      res.json(costs);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Tour Costs: Update or Create
  app.post("/api/tour-costs", authenticateToken, async (req, res) => {
    const { tourName, marketingCost, period } = req.body;
    try {
      const existing = await db.get('SELECT * FROM tour_costs WHERE tourName = ? AND period = ?', [tourName, period]);
      if (existing) {
        await db.run('UPDATE tour_costs SET marketingCost = ? WHERE id = ?', [marketingCost, existing.id]);
      } else {
        await db.run('INSERT INTO tour_costs (tourName, marketingCost, period) VALUES (?, ?, ?)', [tourName, marketingCost, period]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then(vite => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    });
  } else if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

export default app;
