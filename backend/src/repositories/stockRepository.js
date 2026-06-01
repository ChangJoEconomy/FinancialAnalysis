import { requestSupabaseRest } from './supabaseRestRepository.js';

export const STOCK_SELECT = [
  'stock_id',
  'stock_code',
  'ticker',
  'company_name_ko',
  'company_name_en',
  'market',
  'dart_corp_code',
  'industry_code',
  'industry_name',
  'is_active',
  'created_at',
  'updated_at'
].join(',');

const STOCK_WITH_ALIASES_SELECT = `${STOCK_SELECT},stock_aliases(alias_id,alias_name,alias_type)`;

export async function findStockByCode(stockCode) {
  const rows = await requestSupabaseRest(
    `stocks?select=${STOCK_SELECT}&stock_code=eq.${encodeURIComponent(stockCode)}&limit=1`
  );

  return rows[0] || null;
}

export async function findStockById(stockId) {
  const rows = await requestSupabaseRest(
    `stocks?select=${STOCK_SELECT}&stock_id=eq.${Number(stockId)}&limit=1`
  );

  return rows[0] || null;
}

export async function createStock(stock) {
  const rows = await requestSupabaseRest('stocks', {
    method: 'POST',
    prefer: 'return=representation',
    body: stock
  });

  return rows[0];
}

export async function updateStock(stockId, patch) {
  const rows = await requestSupabaseRest(`stocks?stock_id=eq.${stockId}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: patch
  });

  return rows[0];
}

export async function ensureStock(stock) {
  const existing = await findStockByCode(stock.stock_code);

  if (existing) {
    return updateStock(existing.stock_id, stock);
  }

  return createStock(stock);
}

export async function findAlias(stockId, aliasName) {
  const rows = await requestSupabaseRest(
    `stock_aliases?select=alias_id,stock_id,alias_name,alias_type&stock_id=eq.${stockId}&alias_name=eq.${encodeURIComponent(aliasName)}&limit=1`
  );

  return rows[0] || null;
}

export async function createAlias(stockId, alias) {
  const rows = await requestSupabaseRest('stock_aliases', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      stock_id: stockId,
      alias_name: alias.aliasName,
      alias_type: alias.aliasType
    }
  });

  return rows[0];
}

export async function updateAlias(aliasId, alias) {
  const rows = await requestSupabaseRest(`stock_aliases?alias_id=eq.${aliasId}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      alias_type: alias.aliasType
    }
  });

  return rows[0];
}

export async function ensureStockAlias(stockId, alias) {
  const existing = await findAlias(stockId, alias.aliasName);

  if (existing) {
    return updateAlias(existing.alias_id, alias);
  }

  return createAlias(stockId, alias);
}

export async function getStockWithAliasesByCode(stockCode) {
  const rows = await requestSupabaseRest(
    `stocks?select=${STOCK_WITH_ALIASES_SELECT}&stock_code=eq.${encodeURIComponent(stockCode)}&limit=1`
  );

  return rows[0] || null;
}

export async function searchStockAliases(query) {
  return requestSupabaseRest(
    `stock_aliases?select=alias_id,alias_name,alias_type,stocks(${STOCK_SELECT})&alias_name=eq.${encodeURIComponent(query)}`
  );
}

export async function searchStocksByFields(query, limit = 20) {
  const searchPattern = buildIlikePattern(query);
  const filters = [
    `company_name_ko.ilike.${searchPattern}`,
    `company_name_en.ilike.${searchPattern}`,
    `stock_code.ilike.${searchPattern}`,
    `ticker.ilike.${searchPattern}`
  ].join(',');

  return requestSupabaseRest(
    `stocks?select=${STOCK_SELECT}&is_active=eq.true&or=${encodeURIComponent(`(${filters})`)}&limit=${Number(limit) || 20}`
  );
}

export async function searchStockAliasesByName(query, limit = 20) {
  const searchPattern = buildIlikePattern(query);

  return requestSupabaseRest(
    `stock_aliases?select=alias_id,alias_name,alias_type,stocks(${STOCK_SELECT})&alias_name=ilike.${encodeURIComponent(searchPattern)}&limit=${Number(limit) || 20}`
  );
}

function buildIlikePattern(query) {
  return `*${query.trim()}*`;
}
