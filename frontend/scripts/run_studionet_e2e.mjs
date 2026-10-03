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
if (keys.some(key => !/^(0x)?[0-9a-fA-F]{64}$/.test(key || ''))) throw new Error('Pass walletA and walletB keys through stdin JSON');
const wallets = keys.map(key => privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`));
const reader = createClient({ chain: studionet });
const writer = wallet => createClient({ chain: studionet, account: wallet });
const parse = async (fn, args = []) => JSON.parse(await reader.readContract({ address, functionName: fn, args }));
const transactions = [];

async function waitFinalized(hash) {
  let detail;
  for (let attempt = 0; attempt < 90; attempt++) {
    detail = await reader.getTransaction({ hash });
    const status = detail.statusName || detail.status_name || detail.status;
    if (status === 'FINALIZED' || status === 7) return detail;
    if (['CANCELED', 'UNDETERMINED', 8, 9].includes(status)) throw new Error(`${hash}: terminal failure ${status}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error(`${hash}: finality timeout; inspect Explorer`);
}

async function write(wallet, functionName, args, label) {
  let raw;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      raw = await writer(wallet).writeContract({ address, functionName, args });
      break;
    } catch (error) {
      const message = String(error?.message || error);
      if (!message.includes('eth_gasPrice') || attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  const hash = typeof raw === 'string' ? raw : raw?.txId;
  if (!/^0x[0-9a-fA-F]+$/.test(hash || '')) throw new Error(`${label}: invalid transaction id`);
  const detail = await waitFinalized(hash);
  const record = { actor: wallet.address, functionName, hash, label,
    consensus: detail.consensus_data?.result || detail.consensusData?.result || 'UNKNOWN',
    execution: detail.result_name || detail.resultName || 'UNKNOWN',
    status: detail.statusName || detail.status_name || detail.status || 'UNKNOWN' };
  transactions.push(record); console.log(JSON.stringify(record));
  return record;
}

const before = await parse('get_counts');
let seriesId;
let registered;
let assessed;
if (before.series_count > 0) {
  const candidateId = BigInt(before.series_count - 1);
  const candidate = await parse('get_series', [candidateId]);
  if (candidate.creator.toLowerCase() === wallets[0].address.toLowerCase() && candidate.title === 'Winnipeg weekly handoff' && ['REGISTERED', 'ASSESSED'].includes(candidate.state)) {
    seriesId = candidateId; registered = candidate;
    if (candidate.state === 'ASSESSED') assessed = candidate;
    console.log(JSON.stringify({ event: 'resume_series', seriesId: Number(seriesId), state: candidate.state }));
  }
}
if (seriesId === undefined) {
  await write(wallets[0], 'register_series', [
    'Winnipeg weekly handoff', 'America/Winnipeg', '2026-10-01T09:30',
    'FREQ=WEEKLY;INTERVAL=1;COUNT=6', 'PRESERVE_LOCAL_TIME', '2026d', '2026e'
  ], 'wallet_a_registers');
  const created = await parse('get_counts');
  seriesId = BigInt(created.series_count - 1);
  registered = await parse('get_series', [seriesId]);
}
if (registered.creator.toLowerCase() !== wallets[0].address.toLowerCase() || !['REGISTERED', 'ASSESSED'].includes(registered.state)) throw new Error('registration readback mismatch');

if (!assessed) {
  await write(wallets[1], 'assess_series', [seriesId], 'wallet_b_assesses');
  assessed = await parse('get_series', [seriesId]);
}
if (assessed.state !== 'ASSESSED' || assessed.outcome !== 'POTENTIAL_SHIFT') throw new Error(`unexpected assessment: ${JSON.stringify(assessed)}`);

const terminalCounts = await parse('get_counts');
await write(wallets[0], 'assess_series', [seriesId], 'terminal_replay_guard');
const afterReplay = await parse('get_counts');
if (JSON.stringify(terminalCounts) !== JSON.stringify(afterReplay)) throw new Error('terminal replay mutated counters');

await write(wallets[1], 'register_series', [
  'Invalid recurrence guard', 'America/Winnipeg', '2026-10-01T09:30',
  'FREQ=YEARLY;COUNT=500', 'PRESERVE_LOCAL_TIME', '2026d', '2026e'
], 'invalid_rrule_guard');
const finalCounts = await parse('get_counts');
if (finalCounts.series_count !== terminalCounts.series_count) throw new Error('invalid RRULE mutated series count');

console.log(JSON.stringify({ address, chainId: studionet.id, before, finalCounts,
  wallets: wallets.map(wallet => wallet.address), registered, assessed, transactions }, null, 2));
