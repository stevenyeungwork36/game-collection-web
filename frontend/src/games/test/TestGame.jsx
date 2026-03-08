import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { getTranslations } from '../../translations'
import { apiUrl } from '../../api'

export default function TestGame() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const apiBase = typeof window !== 'undefined' ? window.__API_BASE__ : ''

  const runTest = async () => {
    setLoading(true)
    setResult(null)
    const url = apiUrl('/api/games/test/ping')
    const start = Date.now()
    try {
      const res = await fetch(url)
      const ms = Date.now() - start
      const data = await res.json().catch(() => ({}))
      setResult({
        ok: res.ok,
        status: res.status,
        ms,
        data,
        error: null,
      })
    } catch (err) {
      setResult({
        ok: false,
        status: null,
        ms: Date.now() - start,
        data: null,
        error: err.message || String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <h2 className="page-title">{lang === 'zh' ? '連線測試' : 'Connection Test'}</h2>
      <p className="text-muted">
        {lang === 'zh'
          ? '按下方按鈕測試前端是否能連到後端。適合部署後快速檢查。'
          : 'Click the button below to test if the frontend can reach the backend. Useful after deploying.'}
      </p>

      {apiBase && (
        <p className="small text-muted mb-2">
          API base: <code>{apiBase}</code>
        </p>
      )}
      {!apiBase && (
        <p className="small text-muted mb-2">
          {lang === 'zh' ? 'API 與前端同源（未設定 VITE_API_BASE_URL）' : 'API same origin (VITE_API_BASE_URL not set)'}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={runTest}
        disabled={loading}
      >
        {loading ? (lang === 'zh' ? '測試中…' : 'Testing…') : (lang === 'zh' ? '測試後端連線' : 'Test backend connection')}
      </button>

      {result && (
        <div className={`mt-4 p-3 rounded ${result.ok ? 'bg-success bg-opacity-25' : 'bg-danger bg-opacity-25'}`}>
          <strong>{result.ok ? (lang === 'zh' ? '成功' : 'Success') : (lang === 'zh' ? '失敗' : 'Failed')}</strong>
          <ul className="mb-0 mt-2 list-unstyled small">
            {result.status != null && <li>HTTP {result.status}</li>}
            <li>{result.ms} ms</li>
            {result.data && <li><pre className="mb-0 small">{JSON.stringify(result.data, null, 2)}</pre></li>}
            {result.error && <li className="text-danger">{result.error}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
