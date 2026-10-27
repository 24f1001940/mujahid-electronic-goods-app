// src/lib/cloudSync.js
import { db, supabase } from './db';

export async function syncDeviceWithCloud(options = {}) {
  if (!supabase) {
    return {
      success: false,
      message: 'Local Offline Mode active. Add NEXT_PUBLIC_SUPABASE_URL in .env.local whenever you want multi-device cloud sync.'
    };
  }

  try {
    const [products, invoices, khata, repairs, expenses, rawMaterials, orders, repairPayments] = await Promise.all([
      db.products.toArray(),
      db.invoices.toArray(),
      db.khata.toArray(),
      db.repairs.toArray(),
      db.expenses.toArray(),
      db.rawMaterials.toArray(),
      db.orders.toArray(),
      db.repairPayments.toArray()
    ]);

    const payload = {
      replaceCloud: options.replaceCloud === true,
      products: products.map((p) => ({
      id: p.id,
      payload: { ...p, syncStatus: 'SYNCED' },
      updated_at: p.updatedAt || new Date().toISOString()
      })),
      invoices: invoices.map((i) => ({
      invoice_no: i.invoiceNo,
      payload: { ...i, syncStatus: 'SYNCED' },
      updated_at: i.updatedAt || i.createdAtIso || new Date().toISOString()
      })),
      khata: khata.map((k) => ({
      customer_phone: k.customerPhone,
      payload: k,
      updated_at: k.updatedAt || new Date().toISOString()
      })),
      repairs: repairs.map((r) => ({
      token_no: r.tokenNo,
      payload: { ...r, syncStatus: 'SYNCED' },
      updated_at: r.updatedAt || new Date().toISOString()
      })),
      expenses: expenses.map((e) => ({
      id: e.id,
      payload: { ...e, syncStatus: 'SYNCED' },
      updated_at: e.updatedAt || e.createdAtIso || new Date().toISOString()
      })),
      rawMaterials: rawMaterials.map((rm) => ({
      id: rm.id,
      payload: rm,
      updated_at: rm.updatedAt || new Date().toISOString()
      })),
      orders: orders.map((order) => ({
      order_no: order.orderNo,
      payload: order,
      updated_at: order.updatedAt || order.createdAt || new Date().toISOString()
      })),
      repairPayments: repairPayments.map((payment) => ({
      id: payment.id,
      payload: payment,
      updated_at: payment.createdAt || new Date().toISOString()
      }))
    };

    const response = await fetch('/api/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Cloud sync failed');

    const localTables = {
      products: db.products,
      invoices: db.invoices,
      khata: db.khata,
      repairs: db.repairs,
      expenses: db.expenses,
      rawMaterials: db.rawMaterials,
      orders: db.orders,
      repairPayments: db.repairPayments
    };
    for (const [key, localTable] of Object.entries(localTables)) {
      if (result[key]?.length > 0) await localTable.bulkPut(result[key]);
    }

    await Promise.all([
      db.products.where('syncStatus').equals('PENDING_SYNC').modify({ syncStatus: 'SYNCED' }),
      db.invoices.where('syncStatus').equals('PENDING_SYNC').modify({ syncStatus: 'SYNCED' }),
      db.repairs.where('syncStatus').equals('PENDING_SYNC').modify({ syncStatus: 'SYNCED' }),
      db.expenses.where('syncStatus').equals('PENDING_SYNC').modify({ syncStatus: 'SYNCED' })
    ]);

    return { success: true, message: 'All device bills, stock & khata synced with Cloud!' };
  } catch (err) {
    return { success: false, message: `Sync deferred (Offline): ${err.message}` };
  }
}