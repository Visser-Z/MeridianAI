'use client';
import { useState } from 'react';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('activate');

  function handleLogin() {
    if (pw === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      setPwError('Incorrect password.');
    }
  }

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), action }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus({ type: 'success', message: action === 'activate' ? email + ' activated successfully.' : email + ' deactivated successfully.' });
      setEmail('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 40, width: '100%', maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4537E' }} />
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>MeridianAI Admin</span>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Admin password</div>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 7, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
          />
          {pwError && <div style={{ fontSize: 13, color: '#E24B4A', marginBottom: 12 }}>{pwError}</div>}
          <button onClick={handleLogin} style={{ width: '100%', padding: '11px', background: '#D4537E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: '-apple-system, sans-serif', padding: 40 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4537E' }} />
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>MeridianAI Admin</span>
        </div>

        <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Manage client access</div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>Activate or deactivate a client account by email</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setAction('activate')}
              style={{ flex: 1, padding: '8px', borderRadius: 7, border: '0.5px solid', borderColor: action === 'activate' ? '#1D9E75' : '#2a2a2a', background: action === 'activate' ? '#0d2018' : '#1a1a1a', color: action === 'activate' ? '#1D9E75' : '#555', fontSize: 13, cursor: 'pointer' }}
            >
              Activate
            </button>
            <button
              onClick={() => setAction('deactivate')}
              style={{ flex: 1, padding: '8px', borderRadius: 7, border: '0.5px solid', borderColor: action === 'deactivate' ? '#E24B4A' : '#2a2a2a', background: action === 'deactivate' ? '#25100f' : '#1a1a1a', color: action === 'deactivate' ? '#E24B4A' : '#555', fontSize: 13, cursor: 'pointer' }}
            >
              Deactivate
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Client email address</div>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="client@company.com"
            style={{ width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 7, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim()}
            style={{ width: '100%', padding: '11px', background: action === 'activate' ? '#1D9E75' : '#E24B4A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading || !email.trim() ? 'not-allowed' : 'pointer', opacity: loading || !email.trim() ? 0.6 : 1 }}
          >
            {loading ? 'Processing...' : action === 'activate' ? 'Activate client' : 'Deactivate client'}
          </button>

          {status && (
            <div style={{ marginTop: 16, fontSize: 13, padding: '10px 14px', borderRadius: 6, background: status.type === 'success' ? '#0d2018' : '#25100f', border: '0.5px solid ' + (status.type === 'success' ? '#1D9E75' : '#E24B4A'), color: status.type === 'success' ? '#1D9E75' : '#E24B4A' }}>
              {status.message}
            </div>
          )}
        </div>

        <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>How it works</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
            1. Client agrees to your monthly fee and sends payment via EFT<br/>
            2. Enter their email above and click Activate<br/>
            3. They visit the app, enter their email — first login prompts them to set a password<br/>
            4. Each month after payment, access continues automatically<br/>
            5. If they don't pay, come here and deactivate their account
          </div>
        </div>

      </div>
    </div>
  );
}