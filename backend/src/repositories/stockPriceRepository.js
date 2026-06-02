import { requestSupabaseRest } from './supabaseRestRepository.js';

const STOCK_PRICE_SELECT = [
  'price_id',
  'stock_id',
  'trade_date',
  'open_price',
  'high_price',
  'low_price',
  'close_price',
  'adjusted_close',
  'volume',
  'change_amount',
  'change_rate',
  'source_provider',
  'fetched_at'
].join(',');

export async function listRecentStockPrices(stockId, limit = 30) {
  return requestSupabaseRest(
    `stock_prices_daily?select=${STOCK_PRICE_SELECT}&stock_id=eq.${Number(stockId)}&order=trade_date.desc&limit=${Number(limit)}`
  );
}

export async function upsertStockPricesDaily(prices) {
  if (!prices.length) {
    return [];
  }

  return requestSupabaseRest('stock_prices_daily?on_conflict=stock_id,trade_date', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: prices
  });
}

export async function deleteStockPricesBefore(stockId, tradeDate) {
  return requestSupabaseRest(
    `stock_prices_daily?stock_id=eq.${Number(stockId)}&trade_date=lt.${encodeURIComponent(tradeDate)}`,
    {
      method: 'DELETE',
      prefer: 'return=minimal'
    }
  );
}

export async function replaceStockPriceCacheRange(range) {
  const rows = await requestSupabaseRest(
    'stock_price_cache_ranges?on_conflict=stock_id,interval_type,period_start,period_end,adjusted',
    {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: range
    }
  );

  return rows[0] || null;
}
