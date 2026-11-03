import { useEffect, useState } from 'react';
import { api } from '../services/api';

const STATUSES = { join: ['new', 'reviewed', 'accepted', 'rejected'], contact: ['new', 'replied', 'closed'] };

const csvCell = (v) => {
  const s = String(v ?? '');
  // Leading = + - @ would run as a formula when the file is opened in a spreadsheet
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export default function AdminInbox() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('join');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.getTable('form_submissions').then(setRows).catch((e) => {
      setRows([]);
      setError(/form_submissions|schema cache|does not exist/i.test(e.message)
        ? 'The inbox table isn\'t set up yet. Run supabase/001_lockdown_and_forms.sql in Supabase. Until then, submissions still arrive by email.'
        : e.message);
    });
  }, []);

  const setStatus = async (row, status) => {
    try {
      await api.updateRow('form_submissions', { id: row.id, status });
      setRows(rows.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (e) { setError(e.message); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the submission from ${row.name}? This can't be undone.`)) return;
    try {
      await api.deleteRow('form_submissions', row.id);
      setRows(rows.filter((r) => r.id !== row.id));
    } catch (e) { setError(e.message); }
  };

  const list = (rows || []).filter((r) => r.kind === tab);
  const count = (k) => (rows || []).filter((r) => r.kind === k && r.status === 'new').length;

  const exportCsv = () => {
    const keys = [...new Set(list.flatMap((r) => Object.keys(r.data || {})))];
    const lines = [['Date', 'Name', 'Email', 'Status', ...keys], ...list.map((r) => [
      new Date(r.created_at).toLocaleString(), r.name, r.email, r.status, ...keys.map((k) => r.data?.[k]),
    ])].map((l) => l.map(csvCell).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv' }));
    a.download = `klef-acm-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="container" style={{ padding: '40px 24px 80px', maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px', color: '#0F172A' }}>Inbox</h1>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        {[['join', 'Join applications'], ['contact', 'Contact messages']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setTab(k); setOpen(null); }} className="inbox-tab" aria-pressed={tab === k}>
            {label}{count(k) > 0 && <b>{count(k)}</b>}
          </button>
        ))}
        {list.length > 0 && <button type="button" onClick={exportCsv} className="inbox-tab" style={{ marginLeft: 'auto' }}>Export CSV</button>}
      </div>

      {error && <p role="alert" className="inbox-error">{error}</p>}
      {rows === null && <p style={{ color: '#64748B' }}>Loading…</p>}
      {rows !== null && !error && list.length === 0 && <p style={{ color: '#64748B' }}>Nothing here yet.</p>}

      <div style={{ display: 'grid', gap: '10px' }}>
        {list.map((r) => (
          <div key={r.id} className="inbox-row">
            <button type="button" className="inbox-head" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
              <span className={`inbox-status s-${r.status}`}>{r.status}</span>
              <strong>{r.name}</strong>
              <span className="inbox-sub">{r.data?.Subject || r.data?.Department || ''}</span>
              <span className="inbox-date">{new Date(r.created_at).toLocaleDateString()}</span>
            </button>
            {open === r.id && (
              <div className="inbox-body">
                <p><strong>Email:</strong> <a href={`mailto:${r.email}`}>{r.email}</a></p>
                {Object.entries(r.data || {}).map(([k, v]) => <p key={k} style={{ whiteSpace: 'pre-wrap' }}><strong>{k}:</strong> {String(v)}</p>)}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
                  <label htmlFor={`st-${r.id}`}><strong>Status:</strong></label>
                  <select id={`st-${r.id}`} value={r.status} onChange={(e) => setStatus(r, e.target.value)} className="form-control" style={{ width: 'auto', padding: '6px 10px' }}>
                    {STATUSES[r.kind].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={() => remove(r)} className="inbox-del">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
