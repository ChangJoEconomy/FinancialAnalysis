import { inflateRawSync } from 'node:zlib';
import { requestSupabaseRest } from '../repositories/supabaseRestRepository.js';
import { loadEnv } from '../utils/env.js';

const KIND_LIST_ENDPOINT = 'https://kind.krx.co.kr/corpgeneral/corpList.do';
const DART_CORP_CODE_ENDPOINT = 'https://opendart.fss.or.kr/api/corpCode.xml';
const DART_COMPANY_ENDPOINT = 'https://opendart.fss.or.kr/api/company.json';
const BATCH_SIZE = 200;
const DEFAULT_ENRICH_CONCURRENCY = 5;

loadEnv();

const options = parseOptions(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const dartApiKey = requireEnv('DART_API_KEY');
const [kospiStocks, kosdaqStocks, dartCorpCodes] = await Promise.all([
  fetchKindListedStocks({ marketType: 'stockMkt', market: 'KOSPI' }),
  fetchKindListedStocks({ marketType: 'kosdaqMkt', market: 'KOSDAQ' }),
  fetchDartCorpCodes(dartApiKey)
]);

const listedStocks = [...kospiStocks, ...kosdaqStocks]
  .map((stock) => ({
    ...stock,
    ...(dartCorpCodes.get(stock.stock_code)
      ? { dart_corp_code: dartCorpCodes.get(stock.stock_code).corpCode }
      : {})
  }))
  .sort((left, right) => left.stock_code.localeCompare(right.stock_code));
let selectedStocks = options.limit ? listedStocks.slice(0, options.limit) : listedStocks;
if (options.enrichDartCompany) {
  selectedStocks = await enrichStocksWithDartCompany(selectedStocks, dartApiKey, options.enrichConcurrency);
}
const unmatchedStocks = selectedStocks.filter((stock) => !stock.dart_corp_code);

console.log(JSON.stringify({
  mode: options.apply ? 'apply' : 'dry-run',
  sourceCounts: {
    kospi: kospiStocks.length,
    kosdaq: kosdaqStocks.length,
    dartListedCorporations: dartCorpCodes.size
  },
  selectedCount: selectedStocks.length,
  dartMatchedCount: selectedStocks.length - unmatchedStocks.length,
  dartUnmatchedCount: unmatchedStocks.length,
  dartCompanyEnriched: options.enrichDartCompany,
  englishNameCount: selectedStocks.filter((stock) => stock.company_name_en).length,
  industryCodeCount: selectedStocks.filter((stock) => stock.industry_code).length,
  dartUnmatchedSample: unmatchedStocks.slice(0, 10).map(pickSummary),
  sample: selectedStocks.slice(0, 10).map(pickSummary)
}, null, 2));

if (!options.apply) {
  console.log('\nDry-run only. Add --apply to upsert stocks and aliases into Supabase.');
  process.exit(0);
}

const savedStocks = [];
for (const batch of chunk(selectedStocks, BATCH_SIZE)) {
  const saved = await requestSupabaseRest('stocks?on_conflict=stock_code', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: batch
  });
  savedStocks.push(...saved);
  console.log(`Saved stocks: ${savedStocks.length}/${selectedStocks.length}`);
}

const aliases = deduplicateBy(savedStocks.flatMap((stock) => [
  {
    stock_id: stock.stock_id,
    alias_name: stock.company_name_ko,
    alias_type: 'company_name'
  },
  {
    stock_id: stock.stock_id,
    alias_name: stock.stock_code,
    alias_type: 'code'
  },
  ...(stock.company_name_en
    ? [{
        stock_id: stock.stock_id,
        alias_name: stock.company_name_en,
        alias_type: 'english_name'
      }]
    : [])
]), (alias) => `${alias.stock_id}:${alias.alias_name}`);
let savedAliasCount = 0;

for (const batch of chunk(aliases, BATCH_SIZE)) {
  const saved = await requestSupabaseRest('stock_aliases?on_conflict=stock_id,alias_name', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: batch
  });
  savedAliasCount += saved.length;
  console.log(`Saved aliases: ${savedAliasCount}/${aliases.length}`);
}

console.log(JSON.stringify({
  mode: 'apply-complete',
  savedStockCount: savedStocks.length,
  savedAliasCount,
  dartMatchedCount: selectedStocks.length - unmatchedStocks.length,
  dartUnmatchedCount: unmatchedStocks.length
}, null, 2));

async function fetchKindListedStocks({ marketType, market }) {
  const url = new URL(KIND_LIST_ENDPOINT);
  url.search = new URLSearchParams({
    method: 'download',
    searchType: '13',
    marketType
  }).toString();
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`KIND listed corporations request failed: ${response.status}`);
  }

  const html = new TextDecoder('euc-kr').decode(await response.arrayBuffer());
  return parseKindListedStocks(html, market);
}

function parseKindListedStocks(html, market) {
  const stocks = [];

  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => cleanHtmlText(cell[1]));

    if (cells.length < 6 || !/^\d{6}$/.test(cells[2])) {
      continue;
    }

    stocks.push({
      stock_code: cells[2],
      ticker: `${cells[2]}.${market === 'KOSPI' ? 'KS' : 'KQ'}`,
      company_name_ko: cells[0],
      market,
      industry_name: cells[3] || null,
      listed_at: normalizeDate(cells[5]),
      is_active: true
    });
  }

  return deduplicateBy(stocks, (stock) => stock.stock_code);
}

async function fetchDartCorpCodes(apiKey) {
  const url = new URL(DART_CORP_CODE_ENDPOINT);
  url.searchParams.set('crtfc_key', apiKey);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenDART corporation code request failed: ${response.status}`);
  }

  const zip = Buffer.from(await response.arrayBuffer());
  const xml = extractFirstZipEntry(zip).toString('utf8');
  return parseDartCorpCodes(xml);
}

async function enrichStocksWithDartCompany(stocks, apiKey, concurrency) {
  const enriched = [];
  let nextIndex = 0;
  let completedCount = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= stocks.length) {
        return;
      }

      const stock = stocks[index];
      const details = stock.dart_corp_code
        ? await fetchDartCompany({ apiKey, corpCode: stock.dart_corp_code })
        : null;
      enriched[index] = {
        ...stock,
        ...(details?.corp_name_eng ? { company_name_en: details.corp_name_eng } : {}),
        ...(details?.induty_code ? { industry_code: details.induty_code } : {})
      };

      completedCount += 1;
      if (completedCount % 100 === 0 || completedCount === stocks.length) {
        console.log(`Enriched OpenDART companies: ${completedCount}/${stocks.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return enriched;
}

async function fetchDartCompany({ apiKey, corpCode }) {
  const url = new URL(DART_COMPANY_ENDPOINT);
  url.search = new URLSearchParams({
    crtfc_key: apiKey,
    corp_code: corpCode
  }).toString();
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenDART company request failed: ${response.status} corp_code=${corpCode}`);
  }

  const data = await response.json();
  if (data.status === '013') {
    return null;
  }

  if (data.status && data.status !== '000') {
    throw new Error(`OpenDART company returned ${data.status}: ${data.message || 'Unknown error'} corp_code=${corpCode}`);
  }

  return data;
}

function parseDartCorpCodes(xml) {
  const codes = new Map();

  for (const row of xml.matchAll(/<list>([\s\S]*?)<\/list>/gi)) {
    const stockCode = readXmlTag(row[1], 'stock_code');
    if (!/^\d{6}$/.test(stockCode)) {
      continue;
    }

    codes.set(stockCode, {
      corpCode: readXmlTag(row[1], 'corp_code'),
      corpName: readXmlTag(row[1], 'corp_name'),
      modifyDate: readXmlTag(row[1], 'modify_date')
    });
  }

  return codes;
}

function extractFirstZipEntry(zip) {
  const endOffset = findSignatureFromEnd(zip, 0x06054b50);
  if (endOffset === -1) {
    throw new Error('OpenDART corporation code ZIP end record was not found.');
  }

  const centralDirectoryOffset = zip.readUInt32LE(endOffset + 16);
  if (zip.readUInt32LE(centralDirectoryOffset) !== 0x02014b50) {
    throw new Error('OpenDART corporation code ZIP directory was not found.');
  }

  const compressionMethod = zip.readUInt16LE(centralDirectoryOffset + 10);
  const compressedSize = zip.readUInt32LE(centralDirectoryOffset + 20);
  const localHeaderOffset = zip.readUInt32LE(centralDirectoryOffset + 42);
  if (zip.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error('OpenDART corporation code ZIP file header was not found.');
  }

  const fileNameLength = zip.readUInt16LE(localHeaderOffset + 26);
  const extraLength = zip.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = zip.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    return compressed;
  }

  if (compressionMethod === 8) {
    return inflateRawSync(compressed);
  }

  throw new Error(`Unsupported OpenDART ZIP compression method: ${compressionMethod}`);
}

function findSignatureFromEnd(buffer, signature) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      return offset;
    }
  }

  return -1;
}

function readXmlTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return decodeEntities(match?.[1] || '').trim();
}

function cleanHtmlText(value) {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function deduplicateBy(items, keyOf) {
  return [...new Map(items.map((item) => [keyOf(item), item])).values()];
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function pickSummary(stock) {
  return {
    stock_code: stock.stock_code,
    company_name_ko: stock.company_name_ko,
    company_name_en: stock.company_name_en || null,
    market: stock.market,
    dart_corp_code: stock.dart_corp_code || null,
    industry_code: stock.industry_code || null,
    industry_name: stock.industry_name || null,
    listed_at: stock.listed_at || null
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseOptions(args) {
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : null;
  const concurrencyArg = args.find((arg) => arg.startsWith('--enrich-concurrency='));
  const enrichConcurrency = concurrencyArg
    ? Number(concurrencyArg.slice('--enrich-concurrency='.length))
    : DEFAULT_ENRICH_CONCURRENCY;

  if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error('--limit must be a positive integer.');
  }

  if (!Number.isInteger(enrichConcurrency) || enrichConcurrency <= 0 || enrichConcurrency > 10) {
    throw new Error('--enrich-concurrency must be an integer between 1 and 10.');
  }

  return {
    apply: args.includes('--apply'),
    enrichDartCompany: args.includes('--enrich-dart-company'),
    enrichConcurrency,
    help: args.includes('--help'),
    limit
  };
}

function printHelp() {
  console.log(`
Usage:
  node src/workers/seedKrxListedStocks.js
  node src/workers/seedKrxListedStocks.js --apply
  node src/workers/seedKrxListedStocks.js --enrich-dart-company --limit=20
  node src/workers/seedKrxListedStocks.js --apply --enrich-dart-company

Default mode is dry-run. Add --apply only when you want to write to Supabase.
Add --enrich-dart-company to fetch company_name_en and industry_code from OpenDART company.json.
The enrichment calls one OpenDART company request per selected listed corporation.

Sources:
  KIND listed corporations: ${KIND_LIST_ENDPOINT}
  OpenDART corporation codes: ${DART_CORP_CODE_ENDPOINT}
  OpenDART company overview: ${DART_COMPANY_ENDPOINT}
`.trim());
}
