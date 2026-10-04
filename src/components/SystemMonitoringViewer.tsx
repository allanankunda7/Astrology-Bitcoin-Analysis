/**
 * src/components/SystemMonitoringViewer.tsx
 * System Monitoring Dashboard, Market Data Health, Structured Logs & Immutable Audit Trail (Req 15-18)
 * 
 * Provides:
 * 1. Subsystem Health Probes: Frontend, Backend API, Database, Market Data, AI, Paper Broker, WebSocket, Alerts.
 * 2. Stale Market Data Protection status (blocks order creation if data is > 180s stale).
 * 3. Structured Application Logs with event-type and severity filtering.
 * 4. Immutable Audit Trail (append-only ledger tracking all strategy changes, order submissions, rejections, risk limits).
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Server,
  Cpu,
  Database,
  Wifi,
  Filter,
  RefreshCw,
  Lock
} from 'lucide-react';
import {
  systemMonitoring,
  SubsystemStatus,
  MarketDataHealth,
  StructuredLog,
  AuditRecord
} from '../services/systemMonitoring';

export const SystemMonitoringViewer: React.FC = () => {
  const [subsystems, setSubsystems] = useState<SubsystemStatus[]>(() => systemMonitoring.getSubsystemsStatus());
  const [marketHealth, setMarketHealth] = useState<MarketDataHealth>(() => systemMonitoring.getMarketDataHealth());
  const [logs, setLogs] = useState<StructuredLog[]>(() => systemMonitoring.getLogs());
  const [auditTrail, setAuditTrail] = useState<AuditRecord[]>(() => systemMonitoring.getAuditTrail());

  // Filter state
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  const refreshData = () => {
    setSubsystems(systemMonitoring.getSubsystemsStatus());
    setMarketHealth(systemMonitoring.getMarketDataHealth());
    setLogs(systemMonitoring.getLogs());
    setAuditTrail(systemMonitoring.getAuditTrail());
  };

  useEffect(() => {
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchSev = selectedSeverity === 'ALL' || l.severity === selectedSeverity;
    const matchType = selectedEventType === 'ALL' || l.eventType === selectedEventType;
    return matchSev && matchType;
  });

  return (
    <div className="space-y-6 font-mono text-xs">

      {/* 1. Header Bar */}
      <div className="bg-[#090C14] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              SYSTEM MONITORING &amp; AUDIT
            </span>
            <span className="text-slate-500 text-xs">
              Live Subsystems Health, Stale Data Protection &amp; Immutable Audit Trail
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-1">
            System Health Probes &amp; Regulatory Audit Trail
          </h2>
        </div>

        <button
          onClick={refreshData}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Probes</span>
        </button>
      </div>

      {/* 2. Subsystem Health Probes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {subsystems.map((sub) => (
          <div key={sub.id} className="bg-[#0F1420] border border-slate-800 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">{sub.name}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sub.status === 'CONNECTED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950 text-amber-300 border border-amber-500/30'
              }`}>
                {sub.status}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              {sub.details}
            </p>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
              <span>Ping: {sub.responseTimeMs}ms</span>
              <span>Errors: {sub.errorCount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Market Data Health & Stale Data Protection Card */}
      <div className={`p-4 rounded-lg border space-y-3 ${
        marketHealth.isStale
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          : 'bg-[#0F1420] border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm text-white">Market Data Stream Quality &amp; Stale Data Protection</span>
          </div>

          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            marketHealth.isStale ? 'bg-rose-900 text-rose-200' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
          }`}>
            Data Quality Score: {marketHealth.dataQualityScore} / 100
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] block">Active Monitored Asset</span>
            <span className="text-white font-bold">{marketHealth.symbol}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Last Candle Update</span>
            <span className="text-slate-200">{new Date(marketHealth.lastReceivedCandleTime).toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Missing / Duplicate Candles</span>
            <span className="text-white">{marketHealth.missingCandlesCount} / {marketHealth.duplicateCandlesCount}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Order Safety Status</span>
            <span className={marketHealth.isStale ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {marketHealth.isStale ? 'TRADING DISABLED' : 'TRADING PERMITTED'}
            </span>
          </div>
        </div>

        {marketHealth.isStale && (
          <div className="p-2.5 rounded bg-rose-950 border border-rose-500/40 text-xs text-rose-200">
            <strong>Warning: </strong>{marketHealth.staleReason}
          </div>
        )}
      </div>

      {/* 4. Immutable Audit Trail (Req 18) */}
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Immutable Audit Trail Ledger (Req 18)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                {auditTrail.length} records
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only audit trail recording every strategy mutation, backtest execution, paper order, rejection, and risk event.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target ID</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3 text-right">Audit Sequence Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditTrail.map((rec) => (
                <tr key={rec.auditId} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rec.action.includes('REJECTED') || rec.action.includes('BREACHED')
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        : rec.action.includes('CREATED') || rec.action.includes('RESET')
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-amber-300'
                    }`}>
                      {rec.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{rec.targetId}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-sans max-w-md truncate">{rec.details}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-500">{rec.immutableHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Structured Application Logs (Req 17) */}
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Structured Application Logs (Req 17)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Structured operational telemetry across auth, strategy, risk, API, and trading subsystems.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-[#141A26] border border-slate-700 rounded px-2.5 py-1 text-slate-300"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto font-mono text-[11px]">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-2 rounded bg-[#090C14] border border-slate-800/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  log.severity === 'CRITICAL' || log.severity === 'ERROR'
                    ? 'bg-rose-950 text-rose-300'
                    : log.severity === 'WARN'
                    ? 'bg-amber-950 text-amber-300'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  [{log.severity}]
                </span>
                <span className="text-cyan-400">[{log.eventType}]</span>
              </div>
              <span className="text-slate-300 font-sans truncate flex-1 text-left">{log.description}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
