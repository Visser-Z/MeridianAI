'use client';
import { useState, useEffect, useRef } from 'react';

const dots = ['#D4537E','#7F77DD','#1D9E75','#D85A30','#BA7517','#378ADD','#639922'];

export default function Home() {
  const [userLocation, setUserLocation] = useState('South Africa');
  const [currency, setCurrency] = useState('USD');
  const [unit, setUnit] = useState('ton');
  const [topics, setTopics] = useState([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [newTopic, setNewTopic] = useState('');
  const [newMode, setNewMode] = useState('supplier');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sendHour, setSendHour] = useState(7);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestStatus, setDigestStatus] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.email) setUserEmail(data.email); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    fetch('/api/topics?userId=' + encodeURIComponent(userEmail))
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTopics(data);
        setTopicsLoaded(true);
      })
      .catch(() => setTopicsLoaded(true));
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail || !topicsLoaded) return;
    fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userEmail, topics }),
    }).catch(() => {});
  }, [topics, userEmail, topicsLoaded]);

  useEffect(() => {
    if (!userEmail) return;
    fetch('/api/digest-settings?userId=' + encodeURIComponent(userEmail))
      .then(r => r.json())
      .then(data => {
        if (data.email) setEmail(data.email);
        if (data.sendHour !== undefined) setSendHour(data.sendHour);
      })
      .catch(() => {});
  }, [userEmail]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function saveDigestSettings(emailVal, hourVal) {
    if (!userEmail) return;
    await fetch('/api/digest-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userEmail,
        email: emailVal,
        sendHour: hourVal,
        location: userLocation,
        topics: topics.map(t => ({ id: t.id, name: t.name, mode: t.mode })),
      }),
    });
  }

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  function addTopic() {
    if (!newTopic.trim()) return;
    const t = {
      id: Math.random().toString(36).slice(2,7),
      name: newTopic.trim(),
      mode: newMode,
      dot: dots[topics.length % dots.length],
      sentiment: 'neut',
      updated: null,
      report: null,
      chartData: null,
      symbol: null,
    };
    setTopics(prev => [...prev, t]);
    setNewTopic('');
    setActiveTopic(t.id);
    setPage('research');
  }

  function removeTopic(id, e) {
    e.stopPropagation();
    setTopics(prev => prev.filter(t => t.id !== id));
    if (activeTopic === id) { setActiveTopic(null); setPage('dashboard'); }
  }

  function openTopic(id) { setActiveTopic(id); setPage('research'); }
  function goDash() { setPage('dashboard'); setActiveTopic(null); }
  function goDigest() { setPage('digest'); setActiveTopic(null); }
  function goChat() { setPage('chat'); setActiveTopic(null); }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          topics,
          location: userLocation,
          currency,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function runResearch(topicId) {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    setLoading(true);
    try {
      const [researchRes, symbolRes] = await Promise.all([
        fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic.name, mode: topic.mode, location: userLocation, currency, unit }),
        }),
        topic.mode === 'intel'
          ? fetch('/api/resolve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic: topic.name, mode: topic.mode, location: userLocation }),
            })
          : Promise.resolve(null),
      ]);
      const data = await researchRes.json();
      if (data.error) throw new Error(data.error);
      let chartData = null;
      let symbol = null;
      if (symbolRes) {
        const symbolData = await symbolRes.json();
        symbol = symbolData.symbol;
        if (symbol && symbol !== 'NONE') {
          const chartRes = await fetch('/api/chart?symbol=' + symbol);
          const cd = await chartRes.json();
          if (!cd.error) chartData = cd;
        }
      }
      setTopics(prev => prev.map(t => t.id === topicId ? {
        ...t, report: data.report, sentiment: data.sentiment,
        updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chartData, symbol,
      } : t));
    } catch (err) {
      setTopics(prev => prev.map(t => t.id === topicId ? {
        ...t, report: '<p><strong>Error:</strong> ' + err.message + '</p>'
      } : t));
    } finally {
      setLoading(false);
    }
  }

  async function sendDigest() {
    if (!email.trim()) return;
    setDigestLoading(true);
    setDigestStatus(null);
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: topics.map(t => ({
            name: t.name, mode: t.mode, report: t.report,
            sentiment: t.sentiment, updated: t.updated,
          })),
          email
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDigestStatus('success');
    } catch (err) {
      setDigestStatus('error: ' + err.message);
    } finally {
      setDigestLoading(false);
    }
  }

  function formatHour(h) {
    if (h === 0) return '12:00 AM';
    if (h < 12) return h + ':00 AM';
    if (h === 12) return '12:00 PM';
    return (h - 12) + ':00 PM';
  }

  const topic = topics.find(t => t.id === activeTopic);
  const userInitials = userEmail ? userEmail[0].toUpperCase() : 'ME';
  const selectStyle = { fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none', cursor: 'pointer' };

  const s = {
    topbar: { height: 56, background: '#111', borderBottom: '0.5px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' },
    layout: { display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 'calc(100vh - 56px)' },
    sidebar: { background: '#111', borderRight: '0.5px solid #1e1e1e', display: 'flex', flexDirection: 'column', padding: '20px 0' },
    slabel: { fontSize: 10, fontWeight: 500, color: '#3a3a3a', padding: '0 18px', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' },
    main: { padding: 32, background: '#0a0a0a', overflowY: 'auto' },
    card: { background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, padding: 24, marginBottom: 16 },
  };

  function navItem(label, icon, isActive, onClick, badge) {
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', fontSize: 13, color: isActive ? '#fff' : '#555', cursor: 'pointer', borderLeft: isActive ? '2px solid #D4537E' : '2px solid transparent', background: isActive ? '#1a0f14' : 'transparent' }}>
        {icon}
        {label}
        {badge && <span style={{ marginLeft: 'auto', background: '#D4537E', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10 }}>{badge}</span>}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>

      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4537E' }} />
          MeridianAI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={userLocation} onChange={e => setUserLocation(e.target.value)} placeholder="Location..." style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none', width: 130 }} />
          <select value={currency} onChange={e => setCurrency(e.target.value)} style={selectStyle}>
            {['USD','ZAR','EUR','GBP','CNY','AUD','CAD','JPY','INR','BRL'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={unit} onChange={e => setUnit(e.target.value)} style={selectStyle}>
            {['ton','kg','g','lb','unit','box','roll','liter','m²','m³'].map(u => <option key={u} value={u}>per {u}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowEmailModal(true)} style={{ fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 6, background: '#2a0f1a', color: '#D4537E', border: '0.5px solid #3a1525', cursor: 'pointer' }}>Send digest</button>
          <div style={{ fontSize: 11, background: '#1a1a1a', color: '#555', border: '0.5px solid #2a2a2a', padding: '3px 10px', borderRadius: 6 }}>Pro plan</div>
          <div style={{ position: 'relative' }}>
            <div onClick={() => setShowUserMenu(prev => !prev)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a0f1a', border: '0.5px solid #D4537E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#D4537E', cursor: 'pointer', fontWeight: 600 }}>{userInitials}</div>
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 36, background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: 8, minWidth: 180, zIndex: 50 }}>
                <div style={{ padding: '6px 10px', fontSize: 12, color: '#555', borderBottom: '0.5px solid #1e1e1e', marginBottom: 4 }}>{userEmail}</div>
                <div onClick={handleSignOut} style={{ padding: '8px 10px', fontSize: 13, color: '#E24B4A', cursor: 'pointer', borderRadius: 5 }}>Sign out</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={s.layout}>
        <div style={s.sidebar}>
          <div style={s.slabel}>Navigation</div>
          {navItem('Dashboard', <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>, page === 'dashboard', goDash)}
          {navItem('AI Advisor', <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 6c0-1.1.9-2 2-2s2 .9 2 2c0 .8-.5 1.5-1.2 1.8L7 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="10.5" r="0.6" fill="currentColor"/></svg>, page === 'chat', goChat)}
          {navItem('Daily digest', <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5h6M4 7.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>, page === 'digest', goDigest, topics.length > 0 ? topics.length : null)}

          <div style={{ ...s.slabel, marginTop: 20 }}>My topics</div>
          {topics.length === 0 && <div style={{ padding: '8px 18px', fontSize: 12, color: '#2e2e2e' }}>No topics yet</div>}
          {topics.map(t => (
            <div key={t.id} onClick={() => openTopic(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 18px', fontSize: 13, color: activeTopic === t.id && page === 'research' ? '#fff' : '#555', cursor: 'pointer', borderLeft: activeTopic === t.id && page === 'research' ? '2px solid #D4537E' : '2px solid transparent', background: activeTopic === t.id && page === 'research' ? '#1a0f14' : 'transparent' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{t.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3a3a3a', flexShrink: 0 }}>{t.mode === 'supplier' ? 'Supply' : 'Intel'}</span>
              <button onClick={(e) => removeTopic(t.id, e)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          ))}

          <div style={{ padding: '14px 18px', borderTop: '0.5px solid #1e1e1e', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <button onClick={() => setNewMode('supplier')} style={{ flex: 1, fontSize: 11, padding: '5px 4px', borderRadius: 5, border: '0.5px solid', borderColor: newMode === 'supplier' ? '#D4537E' : '#2a2a2a', background: newMode === 'supplier' ? '#2a0f1a' : '#1a1a1a', color: newMode === 'supplier' ? '#D4537E' : '#555', cursor: 'pointer' }}>Supply chain</button>
              <button onClick={() => setNewMode('intel')} style={{ flex: 1, fontSize: 11, padding: '5px 4px', borderRadius: 5, border: '0.5px solid', borderColor: newMode === 'intel' ? '#D4537E' : '#2a2a2a', background: newMode === 'intel' ? '#2a0f1a' : '#1a1a1a', color: newMode === 'intel' ? '#D4537E' : '#555', cursor: 'pointer' }}>Market intel</button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTopic()} placeholder={newMode === 'supplier' ? 'e.g. steel, wheat...' : 'e.g. NVIDIA, Bitcoin...'} style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '7px 8px', borderRadius: 6, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none' }} />
              <button onClick={addTopic} style={{ fontSize: 12, fontWeight: 500, padding: '7px 10px', borderRadius: 6, background: '#D4537E', color: '#fff', border: 'none', cursor: 'pointer' }}>+ Add</button>
            </div>
          </div>
        </div>

        <div style={s.main}>

          {/* Dashboard */}
          {page === 'dashboard' && (
            topics.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#161616', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4537E" strokeWidth="1.4"/><path d="M11 8v3.5l2.5 2" stroke="#D4537E" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Welcome to MeridianAI</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, maxWidth: 360 }}>Add a topic in the sidebar. Choose <strong style={{ color: '#777' }}>Supply chain</strong> for supplier comparisons, or <strong style={{ color: '#777' }}>Market intel</strong> for briefings with live price charts.</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 3 }}>Dashboard</div>
                  <div style={{ fontSize: 13, color: '#555' }}>Your intelligence overview</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
                  {[['Topics tracked', topics.length], ['Briefings generated', topics.filter(t => t.report).length], ['With live charts', topics.filter(t => t.chartData).length]].map(([label, val]) => (
                    <div key={label} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 500 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={s.card}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 16 }}>All topics</div>
                  {topics.map(t => (
                    <div key={t.id} onClick={() => openTopic(t.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid #1a1a1a', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#ccc' }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>{t.chartData ? t.chartData.symbol + ' · $' + t.chartData.currentPrice : t.report ? 'Updated ' + t.updated : 'No briefing yet'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, background: '#1a1a1a', color: '#555', border: '0.5px solid #2a2a2a', padding: '2px 7px', borderRadius: 4 }}>{t.mode === 'supplier' ? 'Supply chain' : 'Market intel'}</span>
                        <SentiBadge s={t.sentiment} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          {/* AI Advisor Chat */}
          {page === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 3 }}>AI Advisor</div>
                <div style={{ fontSize: 13, color: '#555' }}>Ask anything about your topics — get recommendations based on your research</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chatMessages.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                    <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>Try asking:</div>
                    {[
                      'What should I buy right now based on my research?',
                      'Which of my topics has the most risk?',
                      'Are there any good buying opportunities across my topics?',
                      'What connections do you see between my topics?',
                    ].map(suggestion => (
                      <div key={suggestion} onClick={() => { setChatInput(suggestion); }} style={{ fontSize: 13, color: '#555', background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#D4537E'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e1e'}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: msg.role === 'user' ? '#2a0f1a' : '#111',
                      border: '0.5px solid ' + (msg.role === 'user' ? '#3a1525' : '#1e1e1e'),
                      fontSize: 14,
                      color: msg.role === 'user' ? '#D4537E' : '#aaa',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 2px', background: '#111', border: '0.5px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 14, height: 14, border: '2px solid #1e1e1e', borderTopColor: '#D4537E', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      <span style={{ fontSize: 13, color: '#555' }}>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  placeholder="Ask about your topics, get recommendations..."
                  style={{ flex: 1, fontSize: 13, padding: '11px 14px', borderRadius: 8, border: '0.5px solid #2a2a2a', background: '#111', color: '#fff', outline: 'none' }}
                />
                <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} style={{ fontSize: 13, fontWeight: 500, padding: '11px 18px', borderRadius: 8, background: '#D4537E', color: '#fff', border: 'none', cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Daily digest */}
          {page === 'digest' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 3 }}>Daily digest</div>
                <div style={{ fontSize: 13, color: '#555' }}>Get a fresh briefing of all your topics delivered to your inbox every day</div>
              </div>
              {topics.length === 0 ? (
                <div style={s.card}>
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>No topics yet</div>
                    <div style={{ fontSize: 13, color: '#3a3a3a' }}>Add topics in the sidebar first, then set up your digest</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={s.card}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 4 }}>Topics in your digest</div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>{topics.length} topic{topics.length > 1 ? 's' : ''} will be researched fresh and sent daily</div>
                    {topics.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #1a1a1a' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot }} />
                        <span style={{ fontSize: 14, color: '#ccc' }}>{t.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, background: '#1a1a1a', color: '#555', border: '0.5px solid #2a2a2a', padding: '2px 7px', borderRadius: 4 }}>{t.mode === 'supplier' ? 'Supply chain' : 'Market intel'}</span>
                      </div>
                    ))}
                  </div>
                  <div style={s.card}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 16 }}>Digest settings</div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Email address</div>
                      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 7, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none' }} />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Daily send time</div>
                      <select value={sendHour} onChange={e => setSendHour(Number(e.target.value))} style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 7, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none', cursor: 'pointer' }}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{formatHour(i)}</option>)}
                      </select>
                    </div>
                    <button onClick={async () => { await saveDigestSettings(email, sendHour); setDigestStatus('success'); setTimeout(() => setDigestStatus(null), 3000); }} disabled={!email.trim()} style={{ width: '100%', fontSize: 13, fontWeight: 500, padding: '10px', borderRadius: 7, background: '#D4537E', color: '#fff', border: 'none', cursor: !email.trim() ? 'not-allowed' : 'pointer', opacity: !email.trim() ? 0.5 : 1, marginBottom: 12 }}>
                      Save digest settings
                    </button>
                    {digestStatus === 'success' && <div style={{ fontSize: 13, color: '#1D9E75', background: '#0d2018', border: '0.5px solid #1D9E75', borderRadius: 6, padding: '10px 14px' }}>Settings saved — your digest will be sent daily at {formatHour(sendHour)}</div>}
                    {digestStatus && digestStatus.startsWith('error') && <div style={{ fontSize: 13, color: '#E24B4A', background: '#25100f', border: '0.5px solid #E24B4A', borderRadius: 6, padding: '10px 14px' }}>{digestStatus}</div>}
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
                    <div style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, background: '#1a1a1a', color: '#555', border: '0.5px solid #2a2a2a', padding: '2px 7px', borderRadius: 4 }}>{topic.mode === 'supplier' ? 'Supply chain' : 'Market intel'}</span>
                      {topic.updated ? 'Updated ' + topic.updated : 'Not yet researched'}
                    </div>
                  </div>
                </div>
                <button onClick={() => runResearch(topic.id)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 7, background: '#D4537E', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                  {loading ? 'Researching...' : topic.report ? 'Refresh' : 'Run research'}
                </button>
              </div>

              {topic.chartData && (
                <div style={s.card}>
                  <PriceChart data={topic.chartData} dot={topic.dot} />
                </div>
              )}

              <div style={s.card}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '40px 0', fontSize: 14, color: '#555' }}>
                    <div style={{ width: 16, height: 16, border: '2px solid #1e1e1e', borderTopColor: '#D4537E', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    <span>Researching <strong style={{ color: '#aaa' }}>"{topic.name}"</strong> — takes 20–40 seconds...</span>
                  </div>
                ) : topic.report ? (
                  <>
                    <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.85 }} dangerouslySetInnerHTML={{ __html: topic.report }} />
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid #1a1a1a', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#333', marginRight: 4 }}>Powered by:</span>
                      {['Claude', 'Web search'].map(s => <span key={s} style={{ fontSize: 11, background: '#161616', color: '#444', border: '0.5px solid #222', borderRadius: 5, padding: '3px 8px' }}>{s}</span>)}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#161616', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="9" cy="9" r="6" stroke="#D4537E" strokeWidth="1.4"/><path d="M14 14L18 18" stroke="#D4537E" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                      {topic.mode === 'supplier' ? 'Research suppliers & pricing for "' + topic.name + '"' : 'Research "' + topic.name + '"'}
                    </div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 22 }}>Claude will research this with live web search and synthesize the best answer</div>
                    <button onClick={() => runResearch(topic.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 7, background: '#D4537E', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      Generate briefing
                    </button>
                  </div>
                )}
              </div>
              <style>{`
                table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;}
                th{background:#1a1a1a;color:#888;font-weight:500;padding:10px 12px;text-align:left;border-bottom:0.5px solid #2a2a2a;}
                td{padding:10px 12px;color:#aaa;border-bottom:0.5px solid #1a1a1a;}
                tr:last-child td{border-bottom:none;}
                tr:hover td{background:#161616;}
              `}</style>
            </>
          )}
        </div>
      </div>

      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Send digest now</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>Send a one-off digest for all {topics.length} topic{topics.length !== 1 ? 's' : ''} right now</div>
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendDigest()} placeholder="your@email.com" style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 7, border: '0.5px solid #2a2a2a', background: '#1a1a1a', color: '#fff', outline: 'none', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowEmailModal(false)} style={{ flex: 1, fontSize: 13, padding: '9px', borderRadius: 7, background: '#1a1a1a', color: '#555', border: '0.5px solid #2a2a2a', cursor: 'pointer' }}>Cancel</button>
              <button onClick={async () => { await sendDigest(); if (digestStatus === 'success') setShowEmailModal(false); }} disabled={digestLoading || !email.trim()} style={{ flex: 1, fontSize: 13, fontWeight: 500, padding: '9px', borderRadius: 7, background: '#D4537E', color: '#fff', border: 'none', cursor: 'pointer', opacity: digestLoading ? 0.5 : 1 }}>
                {digestLoading ? 'Sending...' : 'Send now'}
              </button>
            </div>
            {digestStatus === 'success' && <div style={{ fontSize: 13, color: '#1D9E75', marginTop: 10 }}>Sent successfully!</div>}
            {digestStatus && digestStatus.startsWith('error') && <div style={{ fontSize: 13, color: '#E24B4A', marginTop: 10 }}>{digestStatus}</div>}
          </div>
        </div>
      )}

      {showUserMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowUserMenu(false)} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}*{box-sizing:border-box;margin:0;padding:0;}`}</style>
    </div>
  );
}

function PriceChart({ data, dot }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const first = data.points[0]?.price;
  const last = data.points[data.points.length - 1]?.price;
  const change = last - first;
  const changePct = ((change / first) * 100).toFixed(2);
  const isUp = change >= 0;
  const color = isUp ? '#1D9E75' : '#E24B4A';

  useEffect(() => {
    if (!canvasRef.current) return;
    const loadChart = async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: data.points.map(p => p.date),
          datasets: [{ data: data.points.map(p => p.price), borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true, backgroundColor: isUp ? 'rgba(29,158,117,0.08)' : 'rgba(226,75,74,0.08)' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ' $' + ctx.parsed.y.toFixed(2) }, backgroundColor: '#1a1a1a', titleColor: '#888', bodyColor: '#fff', borderColor: '#2a2a2a', borderWidth: 1 }
          },
          scales: {
            x: { grid: { color: '#1a1a1a' }, ticks: { color: '#555', font: { size: 11 }, maxTicksLimit: 6 } },
            y: { grid: { color: '#1a1a1a' }, ticks: { color: '#555', font: { size: 11 }, callback: v => '$' + v.toLocaleString() }, position: 'right' }
          }
        }
      });
    };
    loadChart();
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 500 }}>${data.currentPrice.toLocaleString()}</div>
        <div style={{ fontSize: 13, color, fontWeight: 500 }}>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct}%) 1mo</div>
        <div style={{ fontSize: 12, color: '#555', marginLeft: 'auto' }}>{data.symbol} · {data.currency}</div>
      </div>
      <div style={{ height: 200 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

function SentiBadge({ s }) {
  const styles = { bull: { background: '#0d2018', color: '#1D9E75' }, bear: { background: '#25100f', color: '#E24B4A' }, neut: { background: '#1a1a1a', color: '#555' } };
  const labels = { bull: 'Bullish', bear: 'Bearish', neut: 'Neutral' };
  return <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 5, ...styles[s] }}>{labels[s]}</span>;
}