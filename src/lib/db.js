// src/lib/db.js
import Dexie from 'dexie';
import { createClient } from '@supabase/supabase-js';

export const db = new Dexie('MujahidElectronicsDB_v3');

db.version(1).stores({
  products: '++id, name, category, itemType, syncStatus',
  invoices: '++id, invoiceNo, customerName, customerPhone, customerEmail, dateOnly, udhaarAmount, syncStatus',
  khata: '++id, customerPhone, customerName, customerEmail, totalUdhaar, updatedAt',
  repairs: '++id, tokenNo, customerPhone, status, syncStatus',
  expenses: '++id, title, amount, category, dateOnly, createdAt',
  qrs: '++id, name, upiId',
  rawMaterials: '++id, name, stock, unitCost, qtyPerKit'
});

db.version(2).stores({
  products: '++id, name, category, itemType, syncStatus, updatedAt, isActive',
  invoices: '++id, &invoiceNo, customerName, customerPhone, customerEmail, dateOnly, dateKey, udhaarAmount, syncStatus, updatedAt',
  khata: '++id, &customerPhone, customerName, customerEmail, totalUdhaar, updatedAt',
  repairs: '++id, &tokenNo, customerPhone, status, syncStatus, updatedAt',
  expenses: '++id, title, amount, category, dateOnly, dateKey, createdAt, updatedAt',
  qrs: '++id, name, upiId',
  rawMaterials: '++id, name, stock, unitCost, qtyPerKit, updatedAt',
  stockMovements: '++id, productId, type, referenceId, createdAt, syncStatus',
  khataTransactions: '++id, customerPhone, type, invoiceNo, createdAt, syncStatus',
  auditLogs: '++id, action, entityType, entityId, createdAt, syncStatus',
  orders: '++id, &orderNo, customerPhone, status, createdAt, updatedAt, syncStatus',
  repairPayments: '++id, tokenNo, type, createdAt, syncStatus'
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const SHOP_CONFIG = {
  name: "MUJAHID ELECTRONIC GOODS",
  brand: "Dawat دعوت",
  tagline: "Made In India",
  address: "Shop No. 2, 165, Kanhaiya Market, Hazrat Nizamuddin, Delhi-13",
  phones: ["+91 9625035483", "+91 8802572514", "+91 8595431454"],
  primaryWhatsApp: "919625035483",
  defaultTestCustomer: {
    name: "Test Customer",
    phone: "9625035483",
    email: "pluakalu@gmail.com"
  }
};

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Dawat Mic Complete Set (with Leather Bag)",
    hi: "दावत माइक सेट (लेदर बैग के साथ)",
    ur: "دعوت مائیک مکمل سیٹ (لیدر بیگ)",
    category: "Portable PA & Mics",
    keywords: "dawat mic bag set tabligh markaz speaker دعوت",
    displayPrice: 1850,
    minPrice: 1700,
    costPrice: 1350,
    stock: 15,
    warranty: "6 Months Repair Warranty",
    arrivalDate: "26 Oct 2026, 09:00 AM",
    isLegacyStock: false,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  },
  {
    id: 2,
    name: "Ahuja NBA-15 Portable Speaker/Amplifier",
    hi: "अहूजा NBA-15 स्पीकर",
    ur: "اہوجا NBA-15 اسپیکر",
    category: "Amplifiers",
    keywords: "ahuja nba 15 nba-15 speaker amplifier pa system ahu nb15",
    displayPrice: 2600,
    minPrice: 2450,
    costPrice: 2150,
    stock: 8,
    warranty: "1 Year Ahuja Warranty",
    arrivalDate: "Existing / Old Stock (Date Unknown)",
    isLegacyStock: true,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  },
  {
    id: 3,
    name: "Ajanta OLC-302 Wall Clock",
    hi: "अजंता दीवार घड़ी OLC-302",
    ur: "اجنتا وال کلاک OLC-302",
    category: "Clocks & Home",
    keywords: "ajanta olc 302 olc-302 wall clock ghadi ajn",
    displayPrice: 1500,
    minPrice: 1400,
    costPrice: 1180,
    stock: 12,
    warranty: "1 Year Machine Warranty",
    arrivalDate: "Existing / Old Stock (Date Unknown)",
    isLegacyStock: true,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  },
  {
    id: 4,
    name: "Milton Thermos 1 Litre Flask",
    hi: "मिल्टन थर्मस 1 लीटर",
    ur: "ملٹن تھرمس 1 لیٹر",
    category: "Appliances",
    keywords: "milton thermos 1l 1 litre bottle flask garam pani mil thr",
    displayPrice: 950,
    minPrice: 880,
    costPrice: 760,
    stock: 18,
    warranty: "Checking Warranty",
    arrivalDate: "25 Oct 2026, 11:30 AM",
    isLegacyStock: false,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  },
  {
    id: 5,
    name: "MZ Vocal Microphone",
    hi: "MZ माइक",
    ur: "ایم زیڈ مائیک",
    category: "Portable PA & Mics",
    keywords: "mz mic microphone vocal audio",
    displayPrice: 600,
    minPrice: 520,
    costPrice: 410,
    stock: 22,
    warranty: "Checking Warranty",
    arrivalDate: "24 Oct 2026, 04:15 PM",
    isLegacyStock: false,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  },
  {
    id: 6,
    name: "Mic Wire 15 Meter (Heavy Duty)",
    hi: "माइक तार 15 मीटर",
    ur: "مائیک تار 15 میٹر",
    category: "Cables & Wires",
    keywords: "mic wire 15m 15 meter tar cable lead pandrah",
    displayPrice: 300,
    minPrice: 260,
    costPrice: 190,
    stock: 30,
    warranty: "No Warranty",
    arrivalDate: "Existing / Old Stock (Date Unknown)",
    isLegacyStock: true,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  },
  {
    id: 7,
    name: "Mic Wire 20 Meter (Heavy Duty)",
    hi: "माइक तार 20 मीटर",
    ur: "مائیک تار 20 میٹر",
    category: "Cables & Wires",
    keywords: "mic wire 20m 20 meter tar cable lead bees",
    displayPrice: 400,
    minPrice: 350,
    costPrice: 260,
    stock: 25,
    warranty: "No Warranty",
    arrivalDate: "Existing / Old Stock (Date Unknown)",
    isLegacyStock: true,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  },
  {
    id: 8,
    name: "Boli Shaver Machine / Trimmer",
    hi: "बोली शेवर मशीन",
    ur: "بولی شیور مشین",
    category: "Grooming",
    keywords: "boli shaver machine trimmer bol shv",
    displayPrice: 320,
    minPrice: 280,
    costPrice: 210,
    stock: 19,
    warranty: "Checking Warranty",
    arrivalDate: "26 Oct 2026, 10:15 AM",
    isLegacyStock: false,
    itemType: "FINISHED_GOOD",
    image: "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80",
    syncStatus: "SYNCED"
  }
];

export const INITIAL_RAW_MATERIALS = [
  { id: 1, name: "Dawat Printed Black Leather Bag", stock: 25, unitCost: 320, qtyPerKit: 1 },
  { id: 2, name: "Rechargeable Amplifier Speaker Unit", stock: 20, unitCost: 650, qtyPerKit: 1 },
  { id: 3, name: "Collar / Headband Condenser Mic Capsule", stock: 30, unitCost: 180, qtyPerKit: 1 },
  { id: 4, name: "heavy-Duty Charger & Backup Lead", stock: 28, unitCost: 200, qtyPerKit: 1 }
];

export const INITIAL_QRS = [
  { id: 1, name: "Mujahid Electronic Goods (Saqib Main)", upiId: "9625035483@ybl", customQrImage: "" },
  { id: 2, name: "Mujahid Counter (+91 8802572514)", upiId: "8802572514@paytm", customQrImage: "" },
  { id: 3, name: "Mujahid Alt (+91 8595431454)", upiId: "8595431454@okaxis", customQrImage: "" },
  { id: 4, name: "Market Partner / Neighbor Shopkeeper", upiId: "kanhaiyamarket@upi", customQrImage: "" }
];

export const INITIAL_REPAIRS = [
  {
    id: 1,
    tokenNo: "REP-101",
    customerName: "Test Customer",
    customerPhone: "9625035483",
    customerEmail: "pluakalu@gmail.com",
    itemName: "Dawat Mic - Charging Socket & Battery Check",
    estimatedCost: 250,
    advancePaid: 50,
    status: "In Repair",
    createdAt: "26 Oct 2026, 11:00 AM",
    syncStatus: "SYNCED"
  }
];

let initPromise = null;

export async function initDatabase() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('meg_clean_slate') === 'true') return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if ((await db.products.count()) === 0) await db.products.bulkPut(INITIAL_PRODUCTS);
        if ((await db.qrs.count()) === 0) await db.qrs.bulkPut(INITIAL_QRS);
        if ((await db.repairs.count()) === 0) await db.repairs.bulkPut(INITIAL_REPAIRS);
        if ((await db.rawMaterials.count()) === 0) await db.rawMaterials.bulkPut(INITIAL_RAW_MATERIALS);
      } catch (err) {
        console.warn('Database init handled safely:', err);
      }
    })();
  }
  return initPromise;
}

export async function clearTestTransactionsOnly() {
  await Promise.all([
    db.invoices.clear(),
    db.khata.clear(),
    db.khataTransactions.clear(),
    db.repairs.clear(),
    db.expenses.clear(),
    db.stockMovements.clear(),
    db.auditLogs.clear(),
    db.orders.clear(),
    db.repairPayments.clear()
  ]);
}

export async function wipeEntireDatabaseClean() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('meg_clean_slate', 'true');
  }
  await Promise.all([
    db.products.clear(),
    db.invoices.clear(),
    db.khata.clear(),
    db.khataTransactions.clear(),
    db.repairs.clear(),
    db.expenses.clear(),
    db.stockMovements.clear(),
    db.auditLogs.clear(),
    db.orders.clear(),
    db.repairPayments.clear(),
    db.qrs.clear(),
    db.rawMaterials.clear()
  ]);
  await db.qrs.put({
    id: 1,
    name: "Mujahid Electronic Goods (Main Counter)",
    upiId: "8802572514@paytm",
    customQrImage: ""
  });
}

export async function reloadDefaultShopData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('meg_clean_slate');
  }
  await Promise.all([
    db.products.clear(),
    db.invoices.clear(),
    db.khata.clear(),
    db.repairs.clear(),
    db.expenses.clear(),
    db.qrs.clear(),
    db.rawMaterials.clear()
  ]);
  await db.products.bulkPut(INITIAL_PRODUCTS);
  await db.qrs.bulkPut(INITIAL_QRS);
  await db.repairs.bulkPut(INITIAL_REPAIRS);
  await db.rawMaterials.bulkPut(INITIAL_RAW_MATERIALS);
}