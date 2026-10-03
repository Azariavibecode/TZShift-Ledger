import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createInterface } from 'node:readline/promises';

const address = process.env.CONTRACT_ADDRESS;
if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) throw new Error('Set CONTRACT_ADDRESS');
if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(true);
const input = createInterface({ input: process.stdin, terminal: false });
const credentials = JSON.parse(await input.question('')); input.close();
if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(false);
const keys = [credentials.walletA, credentials.walletB];
if (keys.some(key => !/^(0x)?[0-9a-fA-F]{64}$/.test(key || ''))) throw new Error('Invalid test wallet input');
const wallets = keys.map(key => privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`));
const reader = createClient({ chain: studionet });
const writer = wallet => createClient({ chain: studionet, account: wallet });
const parse = async (fn, args = []) => JSON.parse(await reader.readContract({ address, functionName: fn, args }));

async function finalized(hash) {
  for (let i = 0; i < 90; i++) {
    const detail = await reader.getTransaction({ hash });
    const status = detail.statusName || detail.status_name || detail.status;
    if (status === 'FINALIZED' || status === 7) return detail;
    if (['CANCELED', 'UNDETERMINED', 8, 9].includes(status)) throw new Error(`${hash}: ${status}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error(`${hash}: timeout`);
}

async function send(wallet, functionName, args, label) {
  let raw;
  for (let i = 0; i < 5; i++) {
    try { raw = await writer(wallet).writeContract({ address, functionName, args }); break; }
    catch (error) {
      if (!String(error?.message || error).includes('eth_gasPrice') || i === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  const hash = typeof raw === 'string' ? raw : raw.txId;
  const detail = await finalized(hash);
  const record = { label, actor: wallet.address, hash, status: detail.statusName || detail.status_name || detail.status, execution: detail.result_name || detail.resultName };
  console.log(JSON.stringify(record)); return record;
}

const baseline = await parse('get_counts');
const guards = [
  [wallets[0], 'register_series', ['Bad zone', 'Etc/Imaginary', '2026-10-01T09:30', 'FREQ=WEEKLY;INTERVAL=1;COUNT=6', 'PRESERVE_LOCAL_TIME', '2026d', '2026e'], 'unsupported_tzid'],
  [wallets[1], 'register_series', ['Bad intent', 'Europe/Berlin', '2026-10-01T09:30', 'FREQ=WEEKLY;INTERVAL=1;COUNT=6', 'PAY_ME', '2026d', '2026e'], 'invalid_intent'],
  [wallets[0], 'register_series', ['Bad order', 'Asia/Tokyo', '2026-10-01T09:30', 'FREQ=DAILY;INTERVAL=1;COUNT=7', 'PRESERVE_UTC_INSTANT', '2026e', '2026d'], 'release_order'],
  [wallets[1], 'assess_series', [999999n], 'missing_series'],
];
const transactions = [];
for (const guard of guards) {
  transactions.push(await send(...guard));
  const now = await parse('get_counts');
  if (now.series_count !== baseline.series_count || now.assessed_count !== baseline.assessed_count) throw new Error(`${guard[3]} mutated counters`);
}

transactions.push(await send(wallets[0], 'register_series', ['Concurrent Winnipeg audit', 'America/Winnipeg', '2026-10-01T09:30', 'FREQ=WEEKLY;INTERVAL=1;COUNT=6', 'PRESERVE_LOCAL_TIME', '2026d', '2026e'], 'conflict_register'));
const afterRegister = await parse('get_counts');
const id = BigInt(afterRegister.series_count - 1);
transactions.push(await send(wallets[0], 'assess_series', [id], 'conflict_assess_wallet_a'));
const afterFirst = await parse('get_counts');
transactions.push(await send(wallets[1], 'assess_series', [id], 'conflict_assess_wallet_b_replay'));
const finalCounts = await parse('get_counts');
const item = await parse('get_series', [id]);
if (afterFirst.assessed_count !== baseline.assessed_count + 1 || finalCounts.assessed_count !== afterFirst.assessed_count || item.state !== 'ASSESSED') throw new Error('conflict/replay invariant failed');
console.log(JSON.stringify({ address, baseline, finalCounts, conflictSeries: item, transactions }, null, 2));
