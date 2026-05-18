import { loadEnv } from '../utils/env.js';
import { seedSamsungElectronics } from '../services/stockSeedService.js';

loadEnv();

const result = await seedSamsungElectronics();

console.log(JSON.stringify(result, null, 2));
