import {
  ensureStock,
  ensureStockAlias,
  getStockWithAliasesByCode,
  searchStockAliases
} from '../repositories/stockRepository.js';

export const samsungElectronicsStock = {
  stock_code: '005930',
  ticker: '005930.KS',
  company_name_ko: '삼성전자',
  company_name_en: 'Samsung Electronics',
  market: 'KOSPI',
  dart_corp_code: '00126380',
  industry_code: null,
  industry_name: '반도체 / 전자제품',
  is_active: true
};

export const samsungElectronicsAliases = [
  { aliasName: '삼성전자', aliasType: 'company_name' },
  { aliasName: '삼전', aliasType: 'short_name' },
  { aliasName: '005930', aliasType: 'code' },
  { aliasName: 'Samsung Electronics', aliasType: 'english_name' },
  { aliasName: 'Samsung', aliasType: 'keyword' }
];

export async function seedSamsungElectronics() {
  const stock = await ensureStock(samsungElectronicsStock);
  const aliases = [];

  for (const alias of samsungElectronicsAliases) {
    aliases.push(await ensureStockAlias(stock.stock_id, alias));
  }

  const stockQueryResult = await getStockWithAliasesByCode(samsungElectronicsStock.stock_code);
  const aliasQueryResults = {
    '삼성전자': await searchStockAliases('삼성전자'),
    '삼전': await searchStockAliases('삼전'),
    '005930': await searchStockAliases('005930')
  };

  return {
    seededStock: stock,
    seededAliases: aliases,
    queryTests: {
      byStockCode: stockQueryResult,
      byAliases: aliasQueryResults
    }
  };
}
