import React, { useEffect, useState } from 'react'
import { api } from '../api'

const COMPARE_METRICS = [
  { key: 'avg_search_time_min', label: 'Avg Search Time (min)', lower: true },
  { key: 'avg_wait_time_min',   label: 'Avg Wait Time (min)',   lower: true },
  { key: 'avg_gate_queue',      label: 'Avg Gate Queue',        lower: true },
  { key: 'overflow_events',     label: 'Overflow Events',       lower: true },
]

const fmt = (v) => {
  if (v == null || !Number.isFinite(v)) return '—'
  if (v === 0) return '0'
  if (Math.abs(v) >= 100) return v.toFixed(1)
  if (Math.abs(v) >= 10)  return v.toFixed(2)
  if (Math.abs(v) >= 1)   return v.toFixed(3)
  return v.toFixed(4)
}

const STRATEGY_LABELS = {
  B1: 'B1 First Available',
  B2: 'B2 Nearest Available',
  B3: 'B3 Prediction Only',
  P: 'ParkingNav-X',
}

const STRATEGY_COLORS = {
  B1: '#94a3b8',
  B2: '#60a5fa',
  B3: '#a78bfa',
  P: '#10b981',
}

export default function ScenarioControls() {
  const [scenarios, setScenarios] = useState([])
  const [strategies, setStrategies] = useState([])
  const [selectedScenario, setSelectedScenario] = useState('')
  const [selectedStrategy, setSelectedStrategy] = useState('P')
  const [simResult, setSimResult] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [simError, setSimError] = useState('')
  const [compareError, setCompareError] = useState('')
  useEffect(() => {
    Promise.all([api.getScenarios(), api.getStrategies()]).then(([sRes, stRes]) => {
      const scens = sRes.data.scenarios || []
      setScenarios(scens)
      if (scens.length > 0) setSelectedScenario(scens[0])
      setStrategies(stRes.data.strategies || [])
    }).catch(e => {
      setSimError(`Could not load scenarios/strategies: ${e.message}`)
    })
  }, [])

  const runSimulation = async () => {
    setLoading(true)
    setSimResult(null)
    setSimError('')
    try {
      const res = await api.simulate(selectedScenario, selectedStrategy)
      setSimResult(res.data)
    } catch (e) {
      setSimError(`Simulation failed: ${e.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const runComparison = async () => {
    setComparing(true)
    setCompareResult(null)
    setCompareError('')
    try {
      const res = await api.compareStrategies(selectedScenario)
      setCompareResult(res.data)
    } catch (e) {
      setCompareError(`Comparison failed: ${e.response?.data?.detail || e.message}`)
    } finally {
      setComparing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Scenario Controls</h2>
        <p className="text-sm text-gray-500">Run parking simulations and compare strategies head-to-head</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scenario</label>
            <select
              value={selectedScenario}
              onChange={e => setSelectedScenario(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {scenarios.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={e => setSelectedStrategy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {strategies.map(s => (
                <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳ Running...' : '▶ Run Simulation'}
            </button>
            <button
              onClick={runComparison}
              disabled={comparing}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {comparing ? '⏳ Comparing...' : '⚖️ Compare All Strategies'}
            </button>
          </div>
          {(loading || comparing) && (
            <p className="text-xs text-amber-600 font-medium">
              ⏳ Running on free hosting — this takes 60–90 seconds, please wait…
            </p>
          )}
          {simError && (
            <div role="alert" className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {simError}
            </div>
          )}
          {compareError && (
            <div role="alert" className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {compareError}
            </div>
          )}
        </div>
      </div>

      {/* Single sim result */}
      {simResult && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Simulation Result — {simResult.scenario} / {simResult.strategy}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Total Vehicles', simResult.vehicles],
              ['Parked', simResult.metrics?.parked_vehicles],
              ['Overflow Events', simResult.metrics?.overflow_events],
              ['Avg Search Time', simResult.metrics?.avg_search_time_min != null ? `${simResult.metrics.avg_search_time_min} min` : 'N/A'],
              ['Avg Wait Time', simResult.metrics?.avg_wait_time_min != null ? `${simResult.metrics.avg_wait_time_min} min` : 'N/A'],
              ['Avg Gate Queue', simResult.metrics?.avg_gate_queue ?? 'N/A'],
              ['Peak Gate Queue', simResult.metrics?.peak_gate_queue ?? 'N/A'],
              ['Run ID', simResult.run_id],
            ].map(([label, value]) => (
              <div key={label} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-lg font-bold text-gray-800">{value ?? 'N/A'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison — all metrics at a glance */}
      {compareResult && (() => {
        const cmp = compareResult.comparison || {}
        const strategies = ['B1', 'B2', 'B3', 'P']
        const pWins = COMPARE_METRICS.filter(m => {
          const vals = strategies.map(s => cmp[s]?.[m.key]).filter(v => v != null && Number.isFinite(v))
          if (vals.length === 0) return false
          return cmp['P']?.[m.key] === Math.min(...vals)
        }).length

        return (
          <div className="bg-white rounded-lg shadow p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Strategy Comparison — {compareResult.scenario?.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Lower is better for all metrics</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                ParkingNav-X wins {pWins}/{COMPARE_METRICS.length} metrics
              </span>
            </div>

            {/* Per-metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMPARE_METRICS.map(m => {
                const vals = strategies.map(s => ({ s, v: cmp[s]?.[m.key] }))
                const finite = vals.filter(x => x.v != null && Number.isFinite(x.v)).map(x => x.v)
                const maxVal = finite.length ? Math.max(...finite, 1e-9) : 1
                const minVal = finite.length ? Math.min(...finite) : 0
                const pVal = cmp['P']?.[m.key]
                const pIsBest = pVal != null && pVal === minVal

                return (
                  <div key={m.key} className={`rounded-lg border p-3 ${pIsBest ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">{m.label}</span>
                      {pIsBest && <span className="text-xs text-green-700 font-bold">✓ P wins</span>}
                    </div>
                    <div className="space-y-1.5">
                      {strategies.map(s => {
                        const v = cmp[s]?.[m.key]
                        const pct = (v != null && Number.isFinite(v)) ? (v / maxVal) * 100 : 0
                        const isP = s === 'P'
                        const isBest = v != null && v === minVal
                        return (
                          <div key={s} className="flex items-center gap-2">
                            <span className={`w-6 text-xs font-bold flex-shrink-0 ${isP ? 'text-green-700' : 'text-gray-500'}`}>{s}</span>
                            <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
                              <div
                                className="h-full rounded transition-all"
                                style={{ width: `${pct}%`, backgroundColor: STRATEGY_COLORS[s] }}
                              />
                            </div>
                            <span className={`w-16 text-right text-xs font-mono flex-shrink-0 ${isBest ? 'text-green-700 font-bold' : 'text-gray-600'}`}>
                              {fmt(v)}
                            </span>
                            {isBest && <span className="text-green-600 text-xs">★</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
