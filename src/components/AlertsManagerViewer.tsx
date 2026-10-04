import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Clock,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import {
  globalAlertsManager,
  AlertRule,
  TriggeredAlert,
  AlertType
} from '../services/alertsService';

interface AlertsManagerViewerProps {
  currentSymbol: string;
  currentPrice: number;
}

export const AlertsManagerViewer: React.FC<AlertsManagerViewerProps> = ({
  currentSymbol,
  currentPrice
}) => {
  const [rules, setRules] = useState<AlertRule[]>(() => globalAlertsManager.getRules());
  const [history, setHistory] = useState<TriggeredAlert[]>(() => globalAlertsManager.getHistory());
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New rule state
  const [newType, setNewType] = useState<AlertType>('PRICE_NEAR_SR');
  const [newDesc, setNewDesc] = useState<string>('');

  useEffect(() => {
    const unsub = globalAlertsManager.subscribe((newAlert) => {
      setHistory(globalAlertsManager.getHistory());
      setRules(globalAlertsManager.getRules());
    });
    return () => unsub();
  }, []);

  const handleToggleRule = (id: string) => {
    globalAlertsManager.toggleRule(id);
    setRules(globalAlertsManager.getRules());
  };

  const handleDeleteRule = (id: string) => {
    globalAlertsManager.deleteRule(id);
    setRules(globalAlertsManager.getRules());
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    globalAlertsManager.addRule({
      symbol: currentSymbol,
      type: newType,
      conditionDescription: newDesc || `Alert on ${newType} for ${currentSymbol}`,
      enabled: true
    });
    setRules(globalAlertsManager.getRules());
    setShowAddModal(false);
    setNewDesc('');
  };

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <span>Quantitative Market Alerts & Anti-Spam Cooldown Engine</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Monitors real-time price proximity to Support/Resistance, EMA crossovers, RSI extremes (&lt;30 / &gt;70), and confirmed Break of Structure events.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Alert Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
        {/* Active Rules List */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
            <span>ACTIVE ALERT MONITORS ({rules.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">5m Anti-Spam Buffer Active</span>
          </div>

          <div className="space-y-2">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="bg-[#0F1420] border border-slate-800 rounded p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-[11px]">{rule.symbol}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-300">
                      {rule.type.replace('_', ' ')}
                    </span>
                    {rule.triggerCount > 0 && (
                      <span className="text-[10px] text-amber-400">({rule.triggerCount} triggers)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">{rule.conditionDescription}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      rule.enabled
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {rule.enabled ? 'ACTIVE' : 'MUTED'}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 text-slate-600 hover:text-rose-400"
                    title="Delete rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Alert Feed Log */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
            <span>TRIGGERED ALERTS LOG</span>
            <span className="text-[10px] text-slate-500 font-normal">Most recent events</span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Monitoring active market telemetry. No alert conditions triggered recently.
              </div>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded border text-[11px] space-y-1 ${
                    item.severity === 'CRITICAL'
                      ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                      : item.severity === 'WARNING'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🔔</span>
                      <span>{item.title}</span>
                    </span>
                    <span className="text-slate-500">{item.timestamp}</span>
                  </div>
                  <div className="text-slate-300 text-[10px] leading-relaxed">
                    {item.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">CREATE NEW ALERT MONITOR</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">ALERT TYPE</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AlertType)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded p-2 text-white"
                >
                  <option value="PRICE_NEAR_SR">Price Reaching Support / Resistance</option>
                  <option value="RSI_THRESHOLD">RSI Extreme Threshold (&lt;30 / &gt;70)</option>
                  <option value="BOS_BREAKOUT">Break of Structure (BOS Breakout)</option>
                  <option value="EMA_CROSSOVER">EMA 21 / 50 Crossover</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">CUSTOM DESCRIPTION</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={`Alert for ${currentSymbol}...`}
                  className="w-full bg-[#07090E] border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-400 text-slate-950 font-bold"
                >
                  Save Alert Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
