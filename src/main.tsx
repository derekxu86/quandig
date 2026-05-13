import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Activity, Newspaper, FileText, Brain, Radio, BarChart3, Search } from 'lucide-react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import './styles.css'

// 核心修改：将前端的 API 准星对准你本地运行的 8000 端口！
const API_BASE = 'https://reimagined-space-spork-57qqx47v4xgfrv-8000.app.github.dev/'

async function getJson(path: string) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function postJson(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function safeText(v: any, f = '--') { return (v === null || v === undefined || v === '') ? f : String(v) }
function ensureArray(v: any): any[] { return Array.isArray(v) ? v : [] }

function DataStatus({ data }: { data: any }) {
  const status = data?.data_status || data?.status
  const source = safeText(data?.source, 'unknown')
  let cls = 'status-fallback', txt = `Fallback · ${source}`
  if (status === 'real') { cls = 'status-real'; txt = `真实数据 · ${source}` }
  else if (status === 'placeholder') { cls = 'status-placeholder'; txt = `接口预留 · ${source}` }
  else if (status === 'ai-generated') { cls = 'status-ai'; txt = `AI生成 · ${source}` }
  return <span className={`data-status ${cls}`}>{txt}</span>
}

function scoreToRadar(factorScores: any) {
  if (!factorScores || typeof factorScores !== 'object') return []
  return Object.entries(factorScores).map(([name, value]) => ({
    factor: String(name).replaceAll('_', ' '),
    score: Number(value || 0),
  }))
}

function ResearchPanel({ research }: { research: any }) {
  const reports = ensureArray(research?.reports)
  if (!research) return <p className="muted">暂无数据</p>
  return (
    <div className="research-list">
      <DataStatus data={research} />
      {reports.length > 0 ? reports.slice(0, 4).map((r: any, i: number) => (
        <div className="mini-card" key={i}>
            <strong>{safeText(r.title)}</strong>
            <p>{safeText(r.broker)} · {safeText(r.date)}</p>
        </div>
      )) : <div className="empty-card"><strong>暂无研报</strong><p>{research.note || '接口待接入'}</p></div>}
    </div>
  )
}

function SignalPanel({ signals }: { signals: any }) {
  const items = ensureArray(signals?.money_flow?.items)
  if (!signals) return <p className="muted">暂无数据</p>
  return (
    <div className="research-list">
      <DataStatus data={signals} />
      {items.length > 0 ? items.slice(0, 3).map((x: any, i: number) => (
        <div className="mini-card" key={i}><strong>{safeText(x.label)}</strong><p>{safeText(x.value)}</p></div>
      )) : <div className="empty-card"><strong>暂无资金流向</strong><p>{signals.note || '信号层开发中'}</p></div>}
    </div>
  )
}

function SimpleItemsPanel({ data, emptyTitle }: { data: any, emptyTitle: string }) {
  const items = ensureArray(data?.items)
  if (!data) return <p className="muted">暂无数据</p>
  return (
    <div className="research-list">
      <DataStatus data={data} />
      {items.length > 0 ? items.slice(0, 4).map((x: any, i: number) => (
        <div className="mini-card" key={i}>
            <a href={x.url} target="_blank" rel="noreferrer" style={{color: 'inherit', textDecoration: 'none'}}>
                <strong>{safeText(x.title || x.label)}</strong>
                <p>{safeText(x.source || x.type)} · {safeText(x.date)}</p>
            </a>
        </div>
      )) : <div className="empty-card"><strong>{emptyTitle}</strong><p>{data.note || '暂无内容'}</p></div>}
    </div>
  )
}

function App() {
  const [symbol, setSymbol] = useState('600519')
  const [searchText, setSearchText] = useState('贵州茅台')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [market, setMarket] = useState<any>(null)
  const [research, setResearch] = useState<any>(null)
  const [signals, setSignals] = useState<any>(null)
  const [news, setNews] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any>(null)
  const [ai, setAi] = useState<any>(null)

  async function run(s?: string) {
    const sym = s || symbol; setLoading(true)
    try {
      // 同时发起所有请求，加速加载体验
      const [m, r, sig, n, a] = await Promise.all([
        getJson(`/api/market/quote?symbol=${sym}`).catch(e => ({data_status: 'fallback', note: e.message})),
        getJson(`/api/research/reports?symbol=${sym}`).catch(e => ({data_status: 'fallback', note: e.message})),
        getJson(`/api/signals/overview?symbol=${sym}`).catch(e => ({data_status: 'fallback', note: e.message})),
        getJson(`/api/news/stock?symbol=${sym}`).catch(e => ({data_status: 'fallback', note: e.message})),
        getJson(`/api/announcements/stock?symbol=${sym}`).catch(e => ({data_status: 'fallback', note: e.message})),
      ])
      
      setMarket(m); setResearch(r); setSignals(sig); setNews(n); setAnnouncements(a)
      
      // AI 总结层依赖基础数据
      const res = await postJson('/api/ai/conviction', { symbol: sym })
      setAi(res)
    } catch (e) { 
        console.error(e) 
    } finally { 
        setLoading(false) 
    }
  }

  // 组件加载时自动运行一次
  useEffect(() => { run() }, [])

  const radarData = scoreToRadar(ai?.factor_scores)
  const bullCase = ensureArray(ai?.bull_case)
  const bearCase = ensureArray(ai?.bear_case)

  return (
    <div className="app">
      <header className="hero">
        <div>
            <p className="eyebrow">LOCAL ENGINE · AKSHARE + MOOTDX</p>
            <h1>AI Conviction Engine</h1>
        </div>
        <div className="search-box">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input 
                value={searchText} 
                onChange={async (e) => {
                  setSearchText(e.target.value); 
                  setShowDropdown(true)
                  if(e.target.value.length > 0) {
                      try {
                          const d = await getJson(`/api/search/stocks?q=${e.target.value}`)
                          setSuggestions(d.items || [])
                      } catch(err) {
                          setSuggestions([])
                      }
                  } else {
                      setSuggestions([])
                  }
                }} 
                onFocus={() => setShowDropdown(true)} 
                placeholder="搜索代码/拼音/名称" 
            />
            {showDropdown && suggestions.length > 0 && (
              <div className="search-dropdown">
                {suggestions.map((s: any) => (
                  <button key={s.symbol} onMouseDown={() => { 
                      setSymbol(s.symbol); 
                      setSearchText(s.name); 
                      setShowDropdown(false); 
                      run(s.symbol) 
                  }}>
                    <span><strong>{s.name}</strong><em>{s.py}</em></span><b>{s.symbol}</b>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => run()} disabled={loading}>{loading ? '引擎运转中...' : '运行分析'}</button>
        </div>
      </header>

      <main className="grid">
        <section className="layer-card">
          <div className="layer-header">
              <Activity className="layer-icon" />
              <div><h2>行情层</h2><p>实时报价与基础估值</p></div>
          </div>
          {market && (
              <>
                  <DataStatus data={market} />
                  <div className="quote">
                      <div><span className="muted">最新价</span><strong>{market.price || '--'}</strong></div>
                      <div><span className="muted">涨跌幅</span><strong>{market.change_pct !== undefined ? `${market.change_pct}%` : '--'}</strong></div>
                      <div><span className="muted">换手率</span><strong>{market.turnover ? `${market.turnover}%` : '--'}</strong></div>
                  </div>
                  <div className="quote" style={{marginTop: '1rem'}}>
                      <div><span className="muted">PE(TTM)</span><strong>{market.pe || '--'}</strong></div>
                      <div><span className="muted">PB</span><strong>{market.pb || '--'}</strong></div>
                      <div><span className="muted">总市值</span><strong>{market.market_cap ? `${market.market_cap}亿` : '--'}</strong></div>
                  </div>
              </>
          )}
        </section>

        <section className="layer-card">
          <div className="layer-header">
              <FileText className="layer-icon" />
              <div><h2>研报层</h2><p>机构评级与一致预期</p></div>
          </div>
          <ResearchPanel research={research} />
        </section>

        <section className="layer-card">
          <div className="layer-header">
              <BarChart3 className="layer-icon" />
              <div><h2>信号层</h2><p>Akshare 深度资金流向</p></div>
          </div>
          <SignalPanel signals={signals} />
        </section>

        <section className="layer-card">
          <div className="layer-header">
              <Newspaper className="layer-icon" />
              <div><h2>新闻层</h2><p>专属个股情报资讯</p></div>
          </div>
          <SimpleItemsPanel data={news} emptyTitle="暂无新闻" />
        </section>

        <section className="layer-card">
          <div className="layer-header">
              <Radio className="layer-icon" />
              <div><h2>公告层</h2><p>上市公司重要披露</p></div>
          </div>
          <SimpleItemsPanel data={announcements} emptyTitle="暂无公告" />
        </section>

        <section className="layer-card" style={{ gridColumn: '1 / -1' }}>
          <div className="layer-header">
              <Brain className="layer-icon" />
              <div><h2>AI 总结层</h2><p>量化因子综合诊断</p></div>
          </div>
          {ai && (
            <div className="ai-summary">
              <DataStatus data={ai} />
              <div className="score-row">
                  <div className="score">{ai.conviction_score}</div>
                  <div><h3>{ai.view}</h3><p>{ai.market_regime}</p></div>
              </div>
              
              {radarData.length > 0 && (
                <div className="radar-wrap">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="#52525b" radialLines={true} />
                      <PolarAngleAxis dataKey="factor" tick={{ fill: '#d4d4d8', fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                      <Radar name="Conviction" dataKey="score" stroke="#ff5b24" strokeWidth={3} fill="#ff5b24" fillOpacity={0.38} dot={{ fill: '#fff', r: 3 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="cases">
                <div>
                    <h4>Bull Case</h4>
                    {bullCase.length > 0 ? <ul>{bullCase.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="muted">暂无</p>}
                </div>
                <div>
                    <h4>Bear Case</h4>
                    {bearCase.length > 0 ? <ul>{bearCase.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="muted">暂无</p>}
                </div>
              </div>

              <p className="final">{ai.final_summary}</p>
              <p className="risk">{ai.risk_warning}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)