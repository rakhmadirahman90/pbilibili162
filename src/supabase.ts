import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://missjyvqfehamtpyodjr.supabase.co';
const supabaseAnonKey = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

const client = createClient(supabaseUrl, supabaseAnonKey);

// konfigurasi_popup.id adalah UUID dan harus selalu dibuat oleh PostgreSQL.
// Lindungi INSERT/UPSERT dari build lama yang sempat mengirim nama file
// seperti "popup-1786952430584" sebagai id sehingga PostgreSQL menolak request 400.
const isValidUuid = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const stripInvalidPopupId = (row: any) => {
  if (!row || typeof row !== 'object') return row;
  if ('id' in row && row.id != null && !isValidUuid(row.id)) {
    const { id: _invalidId, ...cleanRow } = row;
    return cleanRow;
  }
  return row;
};

const originalFrom = client.from.bind(client);

client.from = ((table: string) => {
  const query = originalFrom(table);
  if (table !== 'konfigurasi_popup') return query;

  const originalInsert = query.insert.bind(query);
  const originalUpsert = query.upsert.bind(query);

  query.insert = ((values: any, options?: any) => {
    const cleanValues = Array.isArray(values)
      ? values.map(stripInvalidPopupId)
      : stripInvalidPopupId(values);
    return originalInsert(cleanValues, options);
  }) as typeof query.insert;

  query.upsert = ((values: any, options?: any) => {
    const cleanValues = Array.isArray(values)
      ? values.map(stripInvalidPopupId)
      : stripInvalidPopupId(values);
    return originalUpsert(cleanValues, options);
  }) as typeof query.upsert;

  return query;
}) as typeof client.from;

export const supabase = client;
