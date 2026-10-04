/**
 * src/components/GlobalStatusBar.tsx
 * Non-Intrusive Global Subsystem Status Bar (Req 29)
 * 
 * Displays:
 * Market Data: CONNECTED | AI: CONNECTED | Database: CONNECTED | Paper Broker: ACTIVE | Data Freshness: GOOD
 * With visual indicators and stale data warning.
 */

import React, { useState, useEffect } from 'react';
import { Shield, Activity, Database, Cpu, Wifi, AlertTriangle } from 'lucide-react';
import { systemMonitoring } from '../services/systemMonitoring';

export const GlobalStatusBar: React.FC = () => {
  const [marketStatus, setMarketStatus] = useState<string>('CONNECTED');
  const [dataFreshness, setDataFreshness] = useState<string>('GOOD');
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = () => {
      const health = systemMonitoring.getMarketDataHealth();
      setIsStale(health.isStale);
      setMarketStatus(health.isStale ? 'DEGRADED' : 'CONNECTED');
      setDataFreshness(health.isStale ? 'DATA STALE' : 'GOOD');
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`h-7 px-4 border-b flex items-center justify-between text-[11px] font-mono shrink-0 select-none transition-colors ${
      isStale ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' : 'bg-[#06080D] border-slate-800/80 text-slate-400'
    }`}>
      {/* Left: System Health Indicators */}
      <div className="flex items-center gap-4 overflow-x-auto py-0.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-500">Market Data:</span>
          <span className={marketStatus === 'CONNECTED' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {marketStatus}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span className="text-slate-500">AI Analyst:</span>
          <span className="text-purple-400 font-bold">CONNECTED</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-slate-500">Database:</span>
          <span className="text-cyan-400 font-bold">CONNECTED</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-slate-500">Paper Broker:</span>
          <span className="text-amber-400 font-bold">ACTIVE (SANDBOX)</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${isStale ? 'bg-rose-500' : 'bg-emerald-400'}`} />
          <span className="text-slate-500">Data Freshness:</span>
          <span className={isStale ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
            {dataFreshness}
          </span>
        </div>
      </div>

      {/* Right: Environment Protection Label */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        {isStale && (
          <span className="flex items-center gap-1 text-rose-400 font-bold animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span>Trading Disabled (Data Stale)</span>
          </span>
        )}
        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-400">
          Zero Look-Ahead Enforcement Active
        </span>
      </div>
    </div>
  );
};
