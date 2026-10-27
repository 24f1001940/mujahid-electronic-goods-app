import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';

const tableConfig = [
  ['meg_products', 'products', 'id'],
  ['meg_invoices', 'invoices', 'invoice_no'],
  ['meg_khata', 'khata', 'customer_phone'],
  ['meg_repairs', 'repairs', 'token_no'],
  ['meg_expenses', 'expenses', 'id'],
  ['meg_raw_materials', 'rawMaterials', 'id'],
  ['meg_orders', 'orders', 'order_no'],
  ['meg_repair_payments', 'repairPayments', 'id']
];

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Server cloud sync is not configured. Add SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!verifyAdminSession(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getAdminSupabase();
    const result = {};

    for (const [table, localKey, remoteKey] of tableConfig) {
      const rows = Array.isArray(body[localKey]) ? body[localKey] : [];
      if (body.replaceCloud) {
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .not(remoteKey, 'is', null);
        if (deleteError) throw new Error(`${table}: ${deleteError.message}`);
      }
      const { data: remoteRows, error: readError } = await supabase
        .from(table)
        .select(`${remoteKey}, payload`);
      if (readError) throw new Error(`${table}: ${readError.message}`);

      const remoteByKey = new Map((remoteRows || []).map((row) => [String(row[remoteKey]), row]));
      const rowsToUpsert = rows.filter((row) => {
        const remote = remoteByKey.get(String(row[remoteKey]));
        if (!remote) return true;
        const incomingTime = Date.parse(row.payload?.updatedAt || row.payload?.createdAt || '');
        const remoteTime = Date.parse(remote.payload?.updatedAt || remote.payload?.createdAt || '');
        return !Number.isFinite(remoteTime) || (Number.isFinite(incomingTime) && incomingTime > remoteTime);
      });
      if (rowsToUpsert.length > 0) {
        const compatibleRows = rowsToUpsert.map(({ updated_at: _updatedAt, ...row }) => row);
        const { error: upsertError } = await supabase.from(table).upsert(compatibleRows);
        if (upsertError) throw new Error(`${table}: ${upsertError.message}`);
      }

      const { data, error: selectError } = await supabase.from(table).select('payload');
      if (selectError) throw new Error(`${table}: ${selectError.message}`);
      result[localKey] = data?.map((row) => row.payload) || [];
      result[`${localKey}Key`] = remoteKey;
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cloud sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
