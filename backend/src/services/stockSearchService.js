import {
  searchStockAliasesByName,
  searchStocksByFields
} from '../repositories/stockRepository.js';

export async function searchStocks(query, limit = 20) {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    throw Object.assign(new Error('Search query is required.'), { statusCode: 400 });
  }

  const [stockMatches, aliasMatches] = await Promise.all([
    searchStocksByFields(normalizedQuery, limit),
    searchStockAliasesByName(normalizedQuery, limit)
  ]);

  return mergeSearchResults(normalizedQuery, stockMatches, aliasMatches).slice(0, Number(limit) || 20);
}

function mergeSearchResults(query, stockMatches, aliasMatches) {
  const resultsById = new Map();

  for (const stock of stockMatches) {
    addResult(resultsById, {
      stock,
      matchedField: resolveMatchedField(query, stock),
      matchedValue: resolveMatchedValue(query, stock),
      score: scoreStockMatch(query, stock)
    });
  }

  for (const alias of aliasMatches) {
    if (!alias.stocks?.is_active) {
      continue;
    }

    addResult(resultsById, {
      stock: alias.stocks,
      matchedField: 'alias_name',
      matchedValue: alias.alias_name,
      score: scoreTextMatch(query, alias.alias_name) + 5
    });
  }

  return [...resultsById.values()].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.company_name_ko.localeCompare(b.company_name_ko, 'ko');
  }).map(({ score, ...result }) => result);
}

function addResult(resultsById, { stock, matchedField, matchedValue, score }) {
  const existing = resultsById.get(stock.stock_id);
  const result = {
    stock_id: stock.stock_id,
    stock_code: stock.stock_code,
    ticker: stock.ticker,
    company_name_ko: stock.company_name_ko,
    company_name_en: stock.company_name_en,
    market: stock.market,
    industry_name: stock.industry_name,
    dart_corp_code: stock.dart_corp_code,
    matched_field: matchedField,
    matched_value: matchedValue,
    score
  };

  if (!existing || result.score > existing.score) {
    resultsById.set(stock.stock_id, result);
  }
}

function resolveMatchedField(query, stock) {
  const fields = [
    ['company_name_ko', stock.company_name_ko],
    ['company_name_en', stock.company_name_en],
    ['stock_code', stock.stock_code],
    ['ticker', stock.ticker]
  ];

  return fields.find(([, value]) => includesQuery(value, query))?.[0] || 'stock';
}

function resolveMatchedValue(query, stock) {
  const field = resolveMatchedField(query, stock);
  return stock[field] || null;
}

function scoreStockMatch(query, stock) {
  return Math.max(
    scoreTextMatch(query, stock.company_name_ko),
    scoreTextMatch(query, stock.company_name_en),
    scoreTextMatch(query, stock.stock_code),
    scoreTextMatch(query, stock.ticker)
  );
}

function scoreTextMatch(query, value) {
  if (!value) {
    return 0;
  }

  const normalizedQuery = query.toLowerCase();
  const normalizedValue = String(value).toLowerCase();

  if (normalizedValue === normalizedQuery) {
    return 100;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 70;
  }

  if (normalizedValue.includes(normalizedQuery)) {
    return 40;
  }

  return 0;
}

function includesQuery(value, query) {
  return value && String(value).toLowerCase().includes(query.toLowerCase());
}
