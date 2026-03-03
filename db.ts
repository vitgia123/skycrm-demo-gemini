import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import os from 'os';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  // Vercel's file system is read-only except for /tmp
  const isVercel = process.env.VERCEL === '1';
  const dbPath = isVercel ? path.join(os.tmpdir(), 'database.sqlite') : './database.sqlite';

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await initializeDb(dbInstance);
  return dbInstance;
}

async function initializeDb(db: Database) {
  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL,
      assignedTours TEXT
    )
  `);

  // Create Leads table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      customerName TEXT NOT NULL,
      phoneNumber TEXT NOT NULL,
      dob TEXT,
      tourInterest TEXT NOT NULL,
      tourPrice REAL,
      discountPrice REAL,
      amountCollected REAL,
      paymentDueDate TEXT,
      documentStatus TEXT,
      documentDueDate TEXT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      resaleCount INTEGER DEFAULT 0,
      notes TEXT,
      assignedTo TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      expectedProfit REAL,
      actualProfit REAL
    )
  `);

  // Create Tours table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tours (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL,
      createdAt TEXT NOT NULL
    )
  `);

  // Create TourCosts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tour_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tourName TEXT NOT NULL,
      marketingCost REAL NOT NULL,
      period TEXT NOT NULL
    )
  `);

  // Seed default admin if no users exist
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const hashedPassword = await bcrypt.hash('123', 10);
    await db.run(
      'INSERT INTO users (id, username, password, name, email, role, assignedTours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['admin_01', 'admin', hashedPassword, 'Admin', 'admin@example.com', 'admin', '[]']
    );
    
    const hashedSalePassword = await bcrypt.hash('123', 10);
    await db.run(
      'INSERT INTO users (id, username, password, name, email, role, assignedTours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['sale_01', 'sale1', hashedSalePassword, 'Nguyễn Văn A (Sale)', 'sale1@example.com', 'sale', '["Đà Lạt 3N2Đ", "Hà Giang Loop"]']
    );
    await db.run(
      'INSERT INTO users (id, username, password, name, email, role, assignedTours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['sale_02', 'sale2', hashedSalePassword, 'Trần Thị B (Sale)', 'sale2@example.com', 'sale', '["Phú Quốc 4N3Đ", "Sapa 2N1Đ"]']
    );
  }

  // Seed demo tours
  const tourCount = await db.get('SELECT COUNT(*) as count FROM tours');
  if (tourCount.count === 0) {
    const demoTours = [
      { id: 'tour_01', name: 'Đà Lạt 3N2Đ', description: 'Khám phá thành phố ngàn hoa', price: 3500000 },
      { id: 'tour_02', name: 'Hà Giang Loop', description: 'Chinh phục cực Bắc', price: 4200000 },
      { id: 'tour_03', name: 'Phú Quốc 4N3Đ', description: 'Nghỉ dưỡng biển đảo', price: 5500000 },
      { id: 'tour_04', name: 'Sapa 2N1Đ', description: 'Săn mây Fansipan', price: 2800000 }
    ];
    for (const tour of demoTours) {
      await db.run(
        'INSERT INTO tours (id, name, description, price, createdAt) VALUES (?, ?, ?, ?, ?)',
        [tour.id, tour.name, tour.description, tour.price, new Date().toISOString()]
      );
    }
  }

  // Seed demo leads
  const leadCount = await db.get('SELECT COUNT(*) as count FROM leads');
  if (leadCount.count === 0) {
    const demoLeads = [
      {
        id: 'lead_01', customerName: 'Lê Văn C', phoneNumber: '0901234567', dob: '1990-05-15',
        tourInterest: 'Đà Lạt 3N2Đ', tourPrice: 3500000, discountPrice: 0, amountCollected: 1000000,
        paymentDueDate: '2026-03-10', source: 'Facebook', status: 'New', resaleCount: 0,
        notes: 'Khách hỏi đi gia đình 4 người', assignedTo: 'sale_01', expectedProfit: 500000, actualProfit: 0
      },
      {
        id: 'lead_02', customerName: 'Phạm Thị D', phoneNumber: '0987654321', dob: '1985-08-20',
        tourInterest: 'Phú Quốc 4N3Đ', tourPrice: 5500000, discountPrice: 500000, amountCollected: 5000000,
        paymentDueDate: '', source: 'Zalo', status: 'Closed', resaleCount: 1,
        notes: 'Khách cũ, đã đi Đà Lạt năm ngoái', assignedTo: 'sale_02', expectedProfit: 1000000, actualProfit: 1000000
      },
      {
        id: 'lead_03', customerName: 'Hoàng Văn E', phoneNumber: '0912345678', dob: '1995-12-05',
        tourInterest: 'Hà Giang Loop', tourPrice: 4200000, discountPrice: 200000, amountCollected: 2000000,
        paymentDueDate: '2026-03-05', source: 'Khác', status: 'Processing', resaleCount: 0,
        notes: 'Cần tư vấn thêm về xe cộ', assignedTo: 'sale_01', expectedProfit: 800000, actualProfit: 0
      },
      {
        id: 'lead_04', customerName: 'Ngô Thị F', phoneNumber: '0933445566', dob: '1988-03-25',
        tourInterest: 'Sapa 2N1Đ', tourPrice: 2800000, discountPrice: 0, amountCollected: 2800000,
        paymentDueDate: '', source: 'Facebook', status: 'Closed', resaleCount: 0,
        notes: 'Chốt nhanh, đi 2 người', assignedTo: 'sale_02', expectedProfit: 600000, actualProfit: 600000
      },
      {
        id: 'lead_05', customerName: 'Đinh Văn G', phoneNumber: '0977889900', dob: '1992-10-10',
        tourInterest: 'Đà Lạt 3N2Đ', tourPrice: 3500000, discountPrice: 0, amountCollected: 0,
        paymentDueDate: '', source: 'Zalo', status: 'Dead', resaleCount: 0,
        notes: 'Khách chê đắt', assignedTo: 'sale_01', expectedProfit: 500000, actualProfit: 0
      }
    ];
    for (const lead of demoLeads) {
      await db.run(
        'INSERT INTO leads (id, customerName, phoneNumber, dob, tourInterest, tourPrice, discountPrice, amountCollected, paymentDueDate, source, status, resaleCount, notes, assignedTo, createdAt, updatedAt, expectedProfit, actualProfit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [lead.id, lead.customerName, lead.phoneNumber, lead.dob, lead.tourInterest, lead.tourPrice, lead.discountPrice, lead.amountCollected, lead.paymentDueDate, lead.source, lead.status, lead.resaleCount, lead.notes, lead.assignedTo, new Date().toISOString(), new Date().toISOString(), lead.expectedProfit, lead.actualProfit]
      );
    }
  }

  // Seed demo tour costs
  const tourCostCount = await db.get('SELECT COUNT(*) as count FROM tour_costs');
  if (tourCostCount.count === 0) {
    const demoTourCosts = [
      { tourName: 'Đà Lạt 3N2Đ', marketingCost: 2000000, period: '2026-02' },
      { tourName: 'Hà Giang Loop', marketingCost: 1500000, period: '2026-02' },
      { tourName: 'Phú Quốc 4N3Đ', marketingCost: 3000000, period: '2026-02' },
      { tourName: 'Sapa 2N1Đ', marketingCost: 1000000, period: '2026-02' }
    ];
    for (const cost of demoTourCosts) {
      await db.run(
        'INSERT INTO tour_costs (tourName, marketingCost, period) VALUES (?, ?, ?)',
        [cost.tourName, cost.marketingCost, cost.period]
      );
    }
  }
}
