'use client';
import { useState } from 'react';

export default function Home() {
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [newTopic, setNewTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const dots = ['#378ADD','#7F77DD','#1D9E75','#D85A30','#BA7517','#D4537E','#639922'];

  function addTopic() {
    if (!newTopic.trim()) return;
    const t = {
      id: Math.random().toString(36).slice(2,7),
      name: newTopic.trim(),
      dot: dots[topics.length % dots.length],
      sentiment: 'neut',
      updated: null,
      report: null,
    };
    setTopics([...topics, t]);
    setNewTopic('');
    setActiveTopic(t.id);
    setPage('research');
  }

  function removeTopic(id, e) {
    e.stopPropagation();
    const remaining = topics.filter(t => t.id !== id);
    setTopics(remaining);
    if (activeTopic === id) { setActiveTopic(null); setPage('dashboard'); }
  }

  function openTopic(id) { setActiveTopic(id); setPage('research'); }
  function goDash() { setPage('dashboard'); setActiveTopic(null); }

  async function runResearch(topicId) {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    setLoading(true);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.name }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTopics(prev => prev.map(t => t.id === topicId ? {
        ...t,
        report: data.report,
        sentiment: data.sentiment,
        updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      } : t));
    } catch (err) {
      setTopics(prev => prev.map(t => t.id === topicId ? {
        ...t, report: `<p><strong>Error:</strong> ${err.message}</p>`
      } : t));
    } finally {
      setLoading(false);
    }
  }

  const topic = topics.find(t => t.id === activeTopic);

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>

      {/* Topbar */}
      <div style={{ height: 56, background: '#111', borderBottom: '0.5px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#378ADD' }} />
          MeridianAI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, background: '#1a1a1a', color: '#555', border: '0.5px solid #2a2a2a', padding: '3px 10px', borderRadius: 6 }}>Pro plan</div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a', border: '0.5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#666' }}>ME</div>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 'calc(100vh - 56px)' }}>

        {/* Sidebar */}
        <div style={{ background: '#111', borderRight: '0.5px solid #1e1e1e', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#3a3a3a', padding: '0 18px', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Navigation</div>

          <div onClick={goDash} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', fontSize: 13, color: page === 'dashboard' ? '#fff' : '#555', cursor: 'pointer', borderLeft: page === 'dashboard' ? '2px solid #378ADD' : '2px solid transparent', background: page === 'dashboard' ? '#161616' : 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Dashboard
          </div>

          <div style={{ fontSize: 10, fontWeight: 500, color: '#3a3a3a', padding: '0 18px', margin: '20px 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>My topics</div>

          {topics.length === 0 && (
            <div style={{ padding: '8px 18px', fontSize: 12, color: '#2e2e2e' }}>No topics yet</div>
          )}

          {topics.map(t => (
            <div key={t.id} onClick={() => openTopic(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 18px', fontSize: 13, color: activeTopic === t.id && page === 'research' ? '#fff' : '#555', cursor: 'pointer', borderLeft: activeTopic === t.id && page === 'research' ? '2px solid #378ADD' : '2px solid transparent', background: activeTopic === t.id && page === 'research' ? '#161616' : 'transparent' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{t.name}</span>
              <button onClick={(e) => removeTopic(t.id, e)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', opacity: 0.7 }}>×</button>
            </div>
          ))}

          {/* Add topic */}
          <div style={{ display: 'flex', gap: 6, padding: '14px 18px', borderTop: '0.5px solid #1e1e1e', marginTop: 'auto' }}>
            <input
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTopic()}
              placeholder="Any topic..."
              style={{ flex: 1, fontSize: 13, padding: '7px 10px', borderRadius: 6, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none' }}
            />
            <button onClick={addTopic} style={{ fontSize: 12, fontWeight: 500, padding: '7px 11px', borderRadius: 6, background: '#378ADD', color: '#fff', border: 'none', cursor: 'pointer' }}>+ Add</button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ padding: 32, background: '#0a0a0a', overflowY: 'auto' }}>

          {/* Dashboard */}
          {page === 'dashboard' && (
            <>
              {topics.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#161616', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#378ADD" strokeWidth="1.4"/><path d="M11 8v3.5l2.5 2" stroke="#378ADD" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Welcome to MeridianAI</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, maxWidth: 320 }}>Type any topic into the sidebar — stocks, crypto, macro, a company, an industry — and Claude will search the web and generate a live intelligence briefing.</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 3 }}>Dashboard</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Your intelligence overview</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
                    {[['Topics tracked', topics.length], ['Briefings generated', topics.filter(t=>t.report).length], ['Bullish signals', `${topics.filter(t=>t.sentiment==='bull').length} / ${topics.length}`]].map(([label, val]) => (
                      <div key={label} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 8, padding: 16 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 500 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 16 }}>All topics</div>
                    {topics.map(t => (
                      <div key={t.id} onClick={() => openTopic(t.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid #1a1a1a', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#ccc' }}>{t.name}</div>
                            <div style={{ fontSize: 12, color: '#444' }}>{t.report ? 'Updated ' + t.updated : 'No briefing yet'}</div>
                          </div>
                        </div>
                        <SentiBadge s={t.sentiment} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Research page */}
          {page === 'research' && topic && (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: '#161616', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: topic.dot }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 500 }}>{topic.name}</div>
                    <div style={{ fontSize: 13, color: '#555' }}>{topic.updated ? 'Updated ' + topic.updated : 'Not yet researched'}</div>
                  </div>
                </div>
                <button onClick={() => runResearch(topic.id)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 7, background: '#378ADD', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                  {loading ? 'Researching...' : topic.report ? 'Refresh' : 'Run research'}
                </button>
              </div>

              <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, padding: 24 }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '40px 0', fontSize: 14, color: '#555' }}>
                    <div style={{ width: 16, height: 16, border: '2px solid #1e1e1e', borderTopColor: '#378ADD', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    Searching the web for <strong style={{ color: '#aaa', marginLeft: 4 }}>"{topic.name}"</strong> — takes 15–30 seconds...
                  </div>
                ) : topic.report ? (
                  <>
                    <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.85 }} dangerouslySetInnerHTML={{ __html: topic.report }} />
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid #1a1a1a', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#333', marginRight: 4 }}>Sources:</span>
                      {['Web search','Live news','Market data'].map(s => <span key={s} style={{ fontSize: 11, background: '#161616', color: '#444', border: '0.5px solid #222', borderRadius: 5, padding: '3px 8px' }}>{s}</span>)}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#161616', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="9" cy="9" r="6" stroke="#378ADD" strokeWidth="1.4"/><path d="M14 14L18 18" stroke="#378ADD" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Research "{topic.name}"</div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 22 }}>Claude will search the web live and return a full intelligence briefing</div>
                    <button onClick={() => runResearch(topic.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 7, background: '#378ADD', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      Generate briefing
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

function SentiBadge({ s }) {
  const styles = {
    bull: { background: '#0d2018', color: '#1D9E75' },
    bear: { background: '#25100f', color: '#E24B4A' },
    neut: { background: '#1a1a1a', color: '#555' },
  };
  const labels = { bull: 'Bullish', bear: 'Bearish', neut: 'Neutral' };
  return <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 5, ...styles[s] }}>{labels[s]}</span>;
}
