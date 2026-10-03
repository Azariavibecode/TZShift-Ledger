import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, Clock3, Compass, ExternalLink, Globe2, LoaderCircle, Plus, RefreshCw, ShieldAlert, WalletCards } from 'lucide-react';

const DEFAULT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x69986c4475740EcDd5bBeB2deA4cE72fccE78dd7';
const EXPLORER = 'https://explorer-studio.genlayer.com';
const blank = { title: '', tzid: 'America/Winnipeg', local_start: '2026-10-01T09:30', rrule: 'FREQ=WEEKLY;INTERVAL=1;COUNT=6', intent: 'PRESERVE_LOCAL_TIME', old_release: '2026d', new_release: '2026e' };
const short = value => value?.length > 19 ? `${value.slice(0, 9)}…${value.slice(-6)}` : value;
const outcomeCopy = {
  PENDING: ['Awaiting source comparison', 'neutral'],
  POTENTIAL_SHIFT: ['Potential rule impact', 'orange'],
  NO_LISTED_CHANGE: ['No change listed in this release pair', 'green'],
  UNRESOLVED: ['Unresolved · safe to retry', 'neutral'],
};

export default function App() {
  const [address, setAddress] = useState(() => localStorage.getItem('tzshift-contract') || DEFAULT_ADDRESS);
  const [wallet, setWallet] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [notice, setNotice] = useState('');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const configured = useMemo(() => /^0x[\da-fA-F]{40}$/.test(address), [address]);
  const reader = useCallback(() => createClient({ chain: studionet }), []);

  const refresh = useCallback(async () => {
    if (!configured) { setItems([]); return; }
    setLoading(true); setError('');
    try {
      const client = reader();
      const counts = JSON.parse(await client.readContract({ address, functionName: 'get_counts', args: [] }));
      const rows = await Promise.all(Array.from({ length: Number(counts.series_count) }, (_, id) =>
        client.readContract({ address, functionName: 'get_series', args: [BigInt(id)] }).then(JSON.parse)));
      setItems(rows.reverse());
    } catch (e) { setError(`StudioNet readback unavailable: ${e?.shortMessage || e?.message || 'RPC error'}`); }
    finally { setLoading(false); }
  }, [address, configured, reader]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!window.ethereum?.on) return undefined;
    const accountsChanged = accounts => setWallet(accounts?.[0] || '');
    const chainChanged = chain => {
      if (BigInt(chain) !== 61999n) { setWallet(''); setNotice('Wallet network changed. Switch back to StudioNet (61999).'); }
    };
    window.ethereum.on('accountsChanged', accountsChanged);
    window.ethereum.on('chainChanged', chainChanged);
    return () => {
      window.ethereum.removeListener?.('accountsChanged', accountsChanged);
      window.ethereum.removeListener?.('chainChanged', chainChanged);
    };
  }, []);

  async function connectWallet() {
    setNotice('');
    if (!window.ethereum) { setNotice('Install or open an injected EVM wallet to continue.'); return; }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = BigInt(await window.ethereum.request({ method: 'eth_chainId' }));
      if (chainId !== 61999n) throw new Error('Switch your wallet to StudioNet (chain ID 61999).');
      setWallet(accounts[0]);
    } catch (e) { setNotice(e?.message || 'Wallet connection was cancelled.'); }
  }

  async function waitFinalized(hash) {
    for (let attempt = 0; attempt < 90; attempt++) {
      const detail = await reader().getTransaction({ hash });
      const status = detail.statusName || detail.status_name || detail.status;
      if (status === 'FINALIZED' || status === 7) return detail;
      if (['CANCELED', 'UNDETERMINED', 8, 9].includes(status)) throw new Error(`Transaction ended with ${status}.`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Finality is taking longer than expected. Keep the Explorer link and refresh state shortly.');
  }

  async function write(functionName, args) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setTxHash(''); setNotice('');
    try {
      if (!configured) throw new Error('Enter the deployed TZShift Ledger contract address first.');
      if (!wallet) throw new Error('Connect any wallet; no special role is required.');
      if (BigInt(await window.ethereum.request({ method: 'eth_chainId' })) !== 61999n) throw new Error('Switch your wallet to StudioNet (chain ID 61999).');
      const client = createClient({ chain: studionet, provider: window.ethereum, account: wallet });
      const hash = await client.writeContract({ address, functionName, args });
      setTxHash(typeof hash === 'string' ? hash : hash?.txId || '');
      setNotice('Transaction submitted. Waiting for finalized consensus…');
      await waitFinalized(typeof hash === 'string' ? hash : hash.txId);
      await refresh();
      setNotice(`${functionName} finalized. Contract state refreshed.`);
      return true;
    } catch (e) { setNotice(e?.shortMessage || e?.message || 'Transaction failed.'); return false; }
    finally { setBusy(false); lock.current = false; }
  }

  const register = async event => {
    event.preventDefault();
    if (await write('register_series', [form.title, form.tzid, form.local_start, form.rrule, form.intent, form.old_release, form.new_release])) setForm(blank);
  };

  return <div className="shell">
    <header className="topbar">
      <a className="brand" href="#top"><img src="/logo.png" alt="TZShift Ledger logo" /><span><b>TZShift Ledger</b><small>CALENDAR RULE WATCH</small></span></a>
      <div className="network"><span className="pulse" /> StudioNet <i>·</i> 61999</div>
      <button className="wallet" onClick={connectWallet}><WalletCards size={16} /> {wallet ? short(wallet) : 'Connect wallet'}</button>
    </header>
    <main id="top">
      <section className="hero">
        <div className="eyebrow"><span>TIME-ZONE RELEASE MONITOR</span><span className="live-tag"><span className="pulse" /> PERMISSIONLESS</span></div>
        <h1>Keep local time.<br /><em>Know when rules move.</em></h1>
        <p>Compare a recurring calendar schedule against two pinned IANA time-zone database releases. Validators review the upstream rule context; the contract records the bounded result.</p>
        <div className="path"><span><CalendarDays size={16} /> SERIES</span><ArrowDownRight size={15} /><span><Globe2 size={16} /> RELEASE PAIR</span><ArrowDownRight size={15} /><span><Compass size={16} /> CONSENSUS</span></div>
      </section>

      <div className="content-grid">
        <section className="card form-card">
          <div className="section-top"><div><div className="section-kicker">01 / CREATE A WATCH</div><h2>Recurring series</h2></div><div className="step-icon"><CalendarDays size={18} /></div></div>
          <form onSubmit={register}>
            <label>Series label<input required minLength="3" maxLength="80" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Weekly team handoff" /></label>
            <div className="form-row"><label>IANA time zone<select value={form.tzid} onChange={e => setForm({ ...form, tzid: e.target.value })}>{['America/Winnipeg','America/Edmonton','America/Toronto','America/Vancouver','America/Los_Angeles','America/New_York','Europe/London','Europe/Berlin','Europe/Paris','Asia/Tokyo','Asia/Kolkata','Australia/Sydney'].map(zone => <option key={zone}>{zone}</option>)}</select></label><label>Local start<input type="datetime-local" required value={form.local_start} onChange={e => setForm({ ...form, local_start: e.target.value })} /></label></div>
            <label>Recurrence rule<select value={form.rrule} onChange={e => setForm({ ...form, rrule: e.target.value })}><option>FREQ=WEEKLY;INTERVAL=1;COUNT=6</option><option>FREQ=WEEKLY;INTERVAL=2;COUNT=8</option><option>FREQ=DAILY;INTERVAL=1;COUNT=7</option><option>FREQ=DAILY;INTERVAL=2;COUNT=8</option></select><small className="help">Bounded daily/weekly subset · maximum 16 occurrences</small></label>
            <label>Scheduling intent<select value={form.intent} onChange={e => setForm({ ...form, intent: e.target.value })}><option value="PRESERVE_LOCAL_TIME">Keep the same local clock time</option><option value="PRESERVE_UTC_INSTANT">Keep the same UTC instant</option></select></label>
            <div className="form-row release-row"><label>Previous release<input value={form.old_release} onChange={e => setForm({ ...form, old_release: e.target.value })} placeholder="2026d" /></label><ArrowUpRight size={15} /><label>New release<input value={form.new_release} onChange={e => setForm({ ...form, new_release: e.target.value })} placeholder="2026e" /></label></div>
            <button className="primary" disabled={busy || !wallet || !configured}><Plus size={17} /> Register series</button>
            {!configured && <div className="inline-config"><label>Contract address<input value={address} onChange={e => { setAddress(e.target.value.trim()); localStorage.setItem('tzshift-contract', e.target.value.trim()); }} placeholder="0x… deployed contract" /></label></div>}
          </form>
          <div className="note"><ShieldAlert size={15} /><span>Impact assessment, not a guarantee. Unavailable or ambiguous evidence stays unresolved; no future stability is inferred.</span></div>
        </section>

        <section className="card activity-card">
          <div className="section-top"><div><div className="section-kicker">02 / PUBLIC REGISTER</div><h2>Recent series</h2></div><button className="refresh" onClick={refresh} aria-label="Refresh"><RefreshCw size={16} /></button></div>
          <div className="contract-line"><span>ACTIVE CONTRACT</span>{configured ? <><code>{short(address)}</code><a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer" title="Open contract in GenLayer Explorer"><ExternalLink size={14} /></a></> : <b>Not configured</b>}</div>
          {!configured && <div className="address-entry"><input aria-label="Contract address" value={address} onChange={e => { setAddress(e.target.value.trim()); localStorage.setItem('tzshift-contract', e.target.value.trim()); }} placeholder="Paste deployed contract address" /></div>}
          {error && <div className="error-box">{error}</div>}
          {notice && <div className="notice-box">{notice}{txHash && <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12} /></a>}</div>}
          <div className="series-list">
            {loading && <div className="empty"><LoaderCircle className="spin" size={18} /> Syncing authoritative contract state…</div>}
            {!loading && !items.length && <div className="empty"><Clock3 size={20} /><span>No series yet. Connect a wallet and register the first one.</span></div>}
            {!loading && items.map(item => { const [label, tone] = outcomeCopy[item.outcome] || outcomeCopy.PENDING; return <article className="series" key={item.id}>
              <div className="series-heading"><span className={`status ${tone}`}>{item.outcome === 'POTENTIAL_SHIFT' ? <ArrowUpRight size={13} /> : item.outcome === 'NO_LISTED_CHANGE' ? <Check size={13} /> : <Clock3 size={13} />}{label}</span><span className="series-id">#{String(item.id).padStart(4,'0')}</span></div>
              <h3>{item.title}</h3><p>{item.tzid} <span>·</span> {item.local_start.replace('T',' ')} local</p>
              <div className="release-pair"><code>{item.old_release}</code><ArrowUpRight size={13} /><code>{item.new_release}</code><span>{item.intent === 'PRESERVE_LOCAL_TIME' ? 'local time' : 'UTC instant'}</span></div>
              {item.state === 'REGISTERED' && <button className="assess" disabled={busy || !wallet} onClick={() => write('assess_series', [BigInt(item.id)])}>{busy ? 'Assessing…' : 'Run source assessment'} <ArrowUpRight size={14} /></button>}
              {item.new_rules_digest && <details><summary>Evidence commitment</summary><div className="digest"><span>upstream commits</span><code>{item.old_release_commit.slice(0,10)}… / {item.new_release_commit.slice(0,10)}…</code><span>new rule SHA-256</span><code>{item.new_rules_digest}</code></div></details>}
            </article>; })}
          </div>
        </section>
      </div>
      <section className="source-strip"><div><span className="section-kicker">AUTHORITY SOURCES</span><strong>Source-traceable, bounded, inspectable.</strong></div><a href="https://www.iana.org/time-zones" target="_blank" rel="noreferrer">IANA tzdb <ExternalLink size={13} /></a><a href="https://github.com/eggert/tz" target="_blank" rel="noreferrer">Upstream rules <ExternalLink size={13} /></a><a href="https://www.rfc-editor.org/rfc/rfc5545.html" target="_blank" rel="noreferrer">RFC 5545 <ExternalLink size={13} /></a></section>
    </main>
    <footer><span>TZSHIFT LEDGER <i>·</i> STUDIO NET / 61999</span><span>Open protocol · any wallet can participate</span></footer>
  </div>;
}
