// src/lib/cloudSync.js
import { db, supabase } from './db';

export async function syncDeviceWithCloud() {
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

    const push = async (table, rows, mapRow) => {
      if (rows.length === 0) return;
      const { error } = await supabase.from(table).upsert(rows.map(mapRow));
      if (error) throw new Error(`${table}: ${error.message}`);
    };

    await push('meg_products', products, (p) => ({
      id: p.id,
      payload: { ...p, syncStatus: 'SYNCED' },
      updated_at: p.updatedAt || new Date().toISOString()
    }));
    await push('meg_invoices', invoices, (i) => ({
      invoice_no: i.invoiceNo,
      payload: { ...i, syncStatus: 'SYNCED' },
      updated_at: i.updatedAt || i.createdAtIso || new Date().toISOString()
    }));
    await push('meg_khata', khata, (k) => ({
      customer_phone: k.customerPhone,
      payload: k,
      updated_at: k.updatedAt || new Date().toISOString()
    }));
    await push('meg_repairs', repairs, (r) => ({
      token_no: r.tokenNo,
      payload: { ...r, syncStatus: 'SYNCED' },
      updated_at: r.updatedAt || new Date().toISOString()
    }));
    await push('meg_expenses', expenses, (e) => ({
      id: e.id,
      payload: { ...e, syncStatus: 'SYNCED' },
      updated_at: e.updatedAt || e.createdAtIso || new Date().toISOString()
    }));
    await push('meg_raw_materials', rawMaterials, (rm) => ({
      id: rm.id,
      payload: rm,
      updated_at: rm.updatedAt || new Date().toISOString()
    }));
    await push('meg_orders', orders, (order) => ({
      order_no: order.orderNo,
      payload: order,
      updated_at: order.updatedAt || order.createdAt || new Date().toISOString()
    }));
    await push('meg_repair_payments', repairPayments, (payment) => ({
      id: payment.id,
      payload: payment,
      updated_at: payment.createdAt || new Date().toISOString()
    }));

    const pull = async (table, localTable) => {
      const { data, error } = await supabase.from(table).select('payload');
      if (error) throw new Error(`${table}: ${error.message}`);
      if (data?.length > 0) await localTable.bulkPut(data.map((row) => row.payload));
    };

    await pull('meg_products', db.products);
    await pull('meg_invoices', db.invoices);
    await pull('meg_khata', db.khata);
    await pull('meg_repairs', db.repairs);
    await pull('meg_expenses', db.expenses);
    await pull('meg_raw_materials', db.rawMaterials);
    await pull('meg_orders', db.orders);
    await pull('meg_repair_payments', db.repairPayments);

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