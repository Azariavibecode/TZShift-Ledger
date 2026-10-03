import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const clients = vi.hoisted(() => ({ reader: null, writer: null }));
vi.mock('genlayer-js', () => ({ createClient: vi.fn(options => options?.provider ? clients.writer : clients.reader) }));
vi.mock('genlayer-js/chains', () => ({ studionet: { id: 61999 } }));
import App from './App.jsx';

const account = '0x67A1A08Fc4cf7D05c859d0d3D8398a3A30B1677e';
const tx = `0x${'a'.repeat(64)}`;
const pending = { assessor: '', creator: account.toLowerCase(), id: 0, intent: 'PRESERVE_LOCAL_TIME', local_start: '2026-10-01T09:30', new_release: '2026e', old_release: '2026d', outcome: 'PENDING', reason: '', rrule: 'FREQ=WEEKLY;INTERVAL=1;COUNT=6', source_file: 'northamerica', state: 'REGISTERED', title: 'UI canonical watch', tzid: 'America/Winnipeg', old_release_commit: '', new_release_commit: '', old_rules_digest: '', new_rules_digest: '' };

function wallet(chain = '0xf22f') {
  const handlers = {};
  return { handlers, request: vi.fn(async ({ method }) => method === 'eth_requestAccounts' ? [account] : chain), on: vi.fn((event, fn) => { handlers[event] = fn; }), removeListener: vi.fn() };
}

beforeEach(() => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key), clear: () => store.clear() };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  window.ethereum = wallet();
  clients.reader = { readContract: vi.fn(async ({ functionName }) => functionName === 'get_counts' ? JSON.stringify({ assessed_count: 0, series_count: 0 }) : JSON.stringify(pending)), getTransaction: vi.fn(async () => ({ statusName: 'FINALIZED' })) };
  clients.writer = { writeContract: vi.fn(async () => tx) };
});
afterEach(() => { cleanup(); delete window.ethereum; vi.restoreAllMocks(); });

async function connectAndFill() {
  render(<App />);
  await waitFor(() => expect(clients.reader.readContract).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /0x67a1/i })).toBeTruthy());
  fireEvent.change(screen.getByLabelText(/series label/i), { target: { value: 'UI canonical watch' } });
}

describe('canonical transaction reconciliation', () => {
  it('retains the hash, waits for FINALIZED, then renders authoritative state', async () => {
    let releaseFinality;
    clients.reader.getTransaction = vi.fn(() => new Promise(resolve => { releaseFinality = resolve; }));
    let countReads = 0;
    clients.reader.readContract = vi.fn(async ({ functionName }) => {
      if (functionName === 'get_counts') { countReads += 1; return JSON.stringify(countReads === 1 ? { assessed_count: 0, series_count: 0 } : { assessed_count: 0, series_count: 1 }); }
      return JSON.stringify(pending);
    });
    await connectAndFill();
    fireEvent.click(screen.getByRole('button', { name: /register series/i }));
    await waitFor(() => expect(screen.getByText(/waiting for finalized consensus/i)).toBeTruthy());
    expect(screen.getByRole('link', { name: /view transaction/i }).getAttribute('href')).toBe(`https://explorer-studio.genlayer.com/transactions/${tx}`);
    expect(screen.queryByText('UI canonical watch')).toBeNull();
    releaseFinality({ statusName: 'FINALIZED', result_name: 'MAJORITY_AGREE' });
    await waitFor(() => expect(screen.getByText('UI canonical watch')).toBeTruthy());
    expect(screen.getByText(/contract state refreshed/i)).toBeTruthy();
  });

  it('shows terminal failure without claiming finalized success', async () => {
    clients.reader.getTransaction = vi.fn(async () => ({ statusName: 'CANCELED' }));
    await connectAndFill();
    fireEvent.click(screen.getByRole('button', { name: /register series/i }));
    await waitFor(() => expect(screen.getByText(/transaction ended with canceled/i)).toBeTruthy());
    expect(screen.queryByText(/contract state refreshed/i)).toBeNull();
    expect(screen.getByRole('link', { name: /view transaction/i }).getAttribute('href')).toContain(tx);
  });

  it('clears the actor when the wallet leaves StudioNet', async () => {
    render(<App />); fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /0x67a1/i })).toBeTruthy());
    window.ethereum.handlers.chainChanged('0x1');
    await waitFor(() => expect(screen.getByText(/switch back to studionet/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeTruthy();
  });
});
