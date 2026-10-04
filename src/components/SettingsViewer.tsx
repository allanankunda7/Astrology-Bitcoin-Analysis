import React, { useState } from 'react';
import {
  Sliders,
  ShieldCheck,
  Volume2,
  VolumeX,
  Server,
  Key,
  CheckCircle2,
  RotateCcw,
  Info
} from 'lucide-react';

interface SettingsViewerProps {
  onSaveSettings?: (settings: any) => void;
}

export const SettingsViewer: React.FC<SettingsViewerProps> = ({ onSaveSettings }) => {
  const [defaultExchange, setDefaultExchange] = useState<string>('Binance Live WebSocket');
  const [defaultRiskPct, setDefaultRiskPct] = useState<number>(1.0);
  const [maxRiskCapPct, setMaxRiskCapPct] = useState<number>(2.0);
  const [defaultFeePct, setDefaultFeePct] = useState<number>(0.05);
  const [defaultSlippagePct, setDefaultSlippagePct] = useState<number>(0.03);
  const [audioChimes, setAudioChimes] = useState<boolean>(true);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  const handleSave = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
    if (onSaveSettings) {
      onSaveSettings({
        defaultExchange,
        defaultRiskPct,
        maxRiskCapPct,
        defaultFeePct,
        defaultSlippagePct,
        audioChimes
      });
    }
  };

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-6 font-mono text-xs max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <span>Platform Settings & Data Source Configuration</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure default execution fees, slippage buffers, account risk rules, and real-time feeds.
          </p>
        </div>

        {showSavedToast && (
          <span className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settings Saved</span>
          </span>
        )}
      </div>

      <div className="space-y-5">
        {/* 1. Market Data Feeds */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-3">
          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>1. MARKET DATA ENGINE & API SOURCE</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">DEFAULT EXCHANGE PROTOCOL</label>
              <select
                value={defaultExchange}
                onChange={(e) => setDefaultExchange(e.target.value)}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white text-xs cursor-pointer"
              >
                <option value="Binance Live WebSocket">Binance Live WebSocket (Crypto)</option>
                <option value="Institutional Calibrated Feed">Institutional Calibrated Feed (Gold & Forex)</option>
                <option value="High-Frequency Simulation">High-Frequency Tick Simulator</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">DATA QUALITY PROTOCOL</label>
              <div className="p-2 rounded bg-[#0F1420] border border-slate-800 text-slate-300 text-[11px] flex items-center justify-between">
                <span>Closed Candle Enforcement:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ACTIVE</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Risk Management & Execution Rules */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-3">
          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>2. EXECUTION & RISK MANAGEMENT PARAMETERS</span>
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">DEFAULT RISK (%)</label>
              <input
                type="number"
                step="0.1"
                value={defaultRiskPct}
                onChange={(e) => setDefaultRiskPct(Number(e.target.value))}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">MAX RISK CAP RULE (%)</label>
              <input
                type="number"
                step="0.5"
                value={maxRiskCapPct}
                onChange={(e) => setMaxRiskCapPct(Number(e.target.value))}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">DEFAULT FEE (%)</label>
              <input
                type="number"
                step="0.01"
                value={defaultFeePct}
                onChange={(e) => setDefaultFeePct(Number(e.target.value))}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">DEFAULT SLIPPAGE (%)</label>
              <input
                type="number"
                step="0.01"
                value={defaultSlippagePct}
                onChange={(e) => setDefaultSlippagePct(Number(e.target.value))}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-1.5 text-white"
              />
            </div>
          </div>
        </div>

        {/* 3. Audio & Notifications */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-3">
          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <span>3. AUDIO TELEMETRY & BREAKING NEWS CHIMES</span>
          </span>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-200 font-bold">Terminal Audio Chimes</div>
              <div className="text-slate-500 text-[11px]">Play subtle harmonic audio cues on breaking world news and triggered alerts</div>
            </div>

            <button
              onClick={() => setAudioChimes(!audioChimes)}
              className={`px-3 py-1.5 rounded font-bold border transition-colors flex items-center gap-1.5 ${
                audioChimes
                  ? 'bg-purple-950 border-purple-500/40 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {audioChimes ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
              <span>{audioChimes ? 'ENABLED' : 'MUTED'}</span>
            </button>
          </div>
        </div>

        {/* 4. Security & Environment Info */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-2">
          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
            <Key className="w-4 h-4 text-amber-400" />
            <span>4. SECURITY & API KEY INTEGRITY</span>
          </span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            All AI model and market integrations are routed through server-side proxy handlers (<code>/api/*</code>).
            No private API keys or operational secrets are ever exposed in frontend client code.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-all text-sm shadow-md"
          >
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
};
