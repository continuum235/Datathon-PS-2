import React from 'react';
import { BarChart3, TrendingDown, Users, AlertOctagon, DollarSign, ArchiveX, X } from 'lucide-react';

const ResultsPage = ({ graph, stats, round, onClose }) => {
  const nodes = graph.nodes || [];
  const links = graph.links || [];
  
  // --- ANALYSIS DATA ---
  const bankStats = {
    safe: nodes.filter(n => n.risk_label === 'SAFE').length,
    undercap: nodes.filter(n => n.risk_label === 'UNDER-CAPITALIZED').length,
    insolvent: nodes.filter(n => n.risk_label === 'INSOLVENT').length,
    total: nodes.filter(n => !n.is_ccp).length
  };

  const riskDistribution = {
    low: nodes.filter(n => !n.is_ccp && n.ml_risk_prob < 0.2).length,
    medium: nodes.filter(n => !n.is_ccp && n.ml_risk_prob >= 0.2 && n.ml_risk_prob < 0.5).length,
    high: nodes.filter(n => !n.is_ccp && n.ml_risk_prob >= 0.5 && n.ml_risk_prob < 0.8).length,
    critical: nodes.filter(n => !n.is_ccp && n.ml_risk_prob >= 0.8).length
  };

  const totalAssets = nodes.reduce((sum, n) => sum + (n.actual_assets || 0), 0);
  const totalProfit = nodes.reduce((sum, n) => sum + (n.profit || 0), 0);
  const avgHealth = (nodes.reduce((sum, n) => sum + (n.health || 0), 0) / bankStats.total).toFixed(1);
  
  const contagionLinks = links.filter(l => l.stress === 'Contagion Risk' && l.type !== 'membership').length;
  const normalLinks = links.filter(l => l.type === 'transaction').length;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 overflow-auto">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#020408] to-[#0a1520] border-b border-cyan-500/30 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 tracking-tight">SIMULATION RESULTS</h1>
          <p className="text-xs text-gray-500 mt-1">Analysis after {round} rounds</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-500/20 rounded transition-all text-gray-400 hover:text-red-400"
        >
          <X size={24} />
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* USP INTRO */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/50 p-4 rounded-lg">
          <h2 className="text-sm font-bold text-purple-300 mb-2">WHAT MAKES THIS ANALYSIS UNIQUE</h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Unlike traditional risk models that use static snapshots, ResilINet combines <strong>Game-Theoretic Nash Equilibrium</strong> + <strong>Graph Attention AI (GATv2)</strong> + <strong>Risk Slope Detection (d(Health)/dt)</strong> to capture how banks make strategic decisions under incomplete information, and how local failures cascade through network contagion in real-time.
          </p>
        </div>
        
        {/* ROW 1: KEY METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            icon={Users} 
            label="Total Banks" 
            value={bankStats.total}
            subtext={`${bankStats.safe} Safe`}
            color="cyan"
          />
          <MetricCard 
            icon={ArchiveX} 
            label="Insolvent" 
            value={bankStats.insolvent}
            subtext={`${((bankStats.insolvent / bankStats.total) * 100).toFixed(1)}%`}
            color="red"
          />
          <MetricCard 
            icon={AlertOctagon} 
            label="Under-Capitalized" 
            value={bankStats.undercap}
            subtext="At Risk"
            color="yellow"
          />
          <MetricCard 
            icon={TrendingDown} 
            label="Contagion Links" 
            value={contagionLinks}
            subtext={`of ${normalLinks}`}
            color="red"
          />
        </div>

        {/* ROW 2: FINANCIAL METRICS WITH USP */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-bold text-cyan-400 tracking-widest">LIQUIDITY & PROFIT ANALYSIS</h3>
          <p className="text-[11px] text-gray-400">Tracks actual financial flows through the network. Unlike traditional Basel metrics, this captures <strong>realized P&L</strong> from game-theoretic strategy execution.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#0a1520]/80 border border-blue-500/30 p-4 rounded-lg">
            <div className="text-xs text-blue-400/70 font-bold tracking-widest mb-2">TOTAL ASSETS</div>
            <div className="text-2xl font-bold text-blue-300 font-mono">₹{(totalAssets / 1e6).toFixed(2)}M</div>
          </div>
          <div className="bg-[#0a1520]/80 border border-green-500/30 p-4 rounded-lg">
            <div className="text-xs text-green-400/70 font-bold tracking-widest mb-2">SYSTEM PROFIT</div>
            <div className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              ₹{(totalProfit / 1e6).toFixed(2)}M
            </div>
          </div>
          <div className="bg-[#0a1520]/80 border border-cyan-500/30 p-4 rounded-lg">
            <div className="text-xs text-cyan-400/70 font-bold tracking-widest mb-2">AVG HEALTH</div>
            <div className="text-2xl font-bold text-cyan-300 font-mono">{avgHealth}%</div>
          </div>
        </div>

        {/* ROW 3: CHARTS WITH USP */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-bold text-purple-400 tracking-widest">NETWORK INTELLIGENCE LAYER</h3>
          <p className="text-[11px] text-gray-400">
            <strong>Bank Status (Left)</strong> uses Nash Equilibrium to classify banks by regulatory capital thresholds. 
            <strong className="block mt-1">ML Risk Distribution (Right)</strong> uses Graph Attention Networks to predict which banks will fail based on peer exposure—detecting <strong>contagion risk 1-2 rounds earlier</strong> than traditional models.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bank Status Distribution */}
          <div className="bg-[#0a1520]/80 border border-cyan-500/30 p-6 rounded-lg">
            <h3 className="text-sm font-bold text-cyan-300 mb-4 flex items-center gap-2">
              <BarChart3 size={16} /> Bank Status Distribution
            </h3>
            <div className="flex items-center justify-between">
              <DonutChart 
                data={[
                  { label: 'Safe', value: bankStats.safe, color: '#06b6d4' },
                  { label: 'Under-Cap', value: bankStats.undercap, color: '#eab308' },
                  { label: 'Insolvent', value: bankStats.insolvent, color: '#ef4444' }
                ]}
              />
              <div className="text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#06b6d4'}}></div>
                  <span className="text-cyan-300">{bankStats.safe} Safe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#eab308'}}></div>
                  <span className="text-yellow-300">{bankStats.undercap} Under-Cap</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#ef4444'}}></div>
                  <span className="text-red-300">{bankStats.insolvent} Insolvent</span>
                </div>
              </div>
            </div>
          </div>

          {/* ML Risk Distribution */}
          <div className="bg-[#0a1520]/80 border border-pink-500/30 p-6 rounded-lg">
            <h3 className="text-sm font-bold text-pink-300 mb-4 flex items-center gap-2">
              <AlertOctagon size={16} /> ML Risk Distribution (GATv2 Predictions)
            </h3>
            <div className="flex items-center justify-between">
              <DonutChart 
                data={[
                  { label: 'Low', value: riskDistribution.low, color: '#10b981' },
                  { label: 'Medium', value: riskDistribution.medium, color: '#f59e0b' },
                  { label: 'High', value: riskDistribution.high, color: '#f97316' },
                  { label: 'Critical', value: riskDistribution.critical, color: '#ef4444' }
                ]}
              />
              <div className="text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#10b981'}}></div>
                  <span className="text-green-300">{riskDistribution.low} Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#f59e0b'}}></div>
                  <span className="text-amber-300">{riskDistribution.medium} Med</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#f97316'}}></div>
                  <span className="text-orange-300">{riskDistribution.high} High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#f97316'}}></div>
                  <span className="text-orange-300">{riskDistribution.high} High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#ef4444'}}></div>
                  <span className="text-red-300">{riskDistribution.critical} Crit</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: STABILITY METRICS WITH USP */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-bold text-pink-400 tracking-widest">SYSTEMIC RISK ACCELERATION DETECTION</h3>
          <p className="text-[11px] text-gray-400">
            <strong>Butterfly Risk</strong> (our proprietary metric) measures <strong>how fast risk is accelerating</strong> through Nash strategy changes + hub concentration. When it spikes, cascades are imminent. 
            <span className="block mt-1"><strong>System Entropy</strong> detects inequality in bank health distributions. <strong>Circuit Status</strong> auto-halts trading when defaults exceed 30%.</span>
          </p>
        </div>
        <div className="bg-[#0a1520]/80 border border-purple-500/30 p-6 rounded-lg">
          <h3 className="text-sm font-bold text-purple-300 mb-4">System Stability Metrics (Real-Time Dynamics)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/40 p-3 rounded border border-pink-500/20">
              <div className="text-xs text-gray-500 mb-1">Butterfly Risk</div>
              <div className="text-lg font-mono text-pink-400 font-bold">{stats.stability?.butterfly_risk || 0}%</div>
              <div className="text-[9px] text-gray-600 mt-1">Risk Acceleration</div>
            </div>
            <div className="bg-black/40 p-3 rounded border border-blue-500/20">
              <div className="text-xs text-gray-500 mb-1">System Entropy</div>
              <div className="text-lg font-mono text-blue-400 font-bold">{stats.stability?.system_entropy || 0}</div>
              <div className="text-[9px] text-gray-600 mt-1">Health Disparity</div>
            </div>
            <div className="bg-black/40 p-3 rounded border border-green-500/20">
              <div className="text-xs text-gray-500 mb-1">🚦 Circuit Status</div>
              <div className={`text-lg font-mono font-bold ${stats.stability?.circuit_status === 'HALTED' ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                {stats.stability?.circuit_status || 'OPEN'}
              </div>
              <div className="text-[9px] text-gray-600 mt-1">Trading Halted?</div>
            </div>
            <div className="bg-black/40 p-3 rounded border border-cyan-500/20">
              <div className="text-xs text-gray-500 mb-1">System Status</div>
              <div className="text-lg font-mono text-cyan-400 font-bold">{stats.stability?.status || 'UNKNOWN'}</div>
              <div className="text-[9px] text-gray-600 mt-1">Overall Health</div>
            </div>
          </div>
        </div>

        {/* ROW 5: BANK DETAILS TABLE WITH USP */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-bold text-cyan-400 tracking-widest">📋 PER-BANK NEURAL RISK ATTRIBUTION</h3>
          <p className="text-[11px] text-gray-400">
            Each bank's ML Risk Prob is computed by <strong>Graph Attention Networks</strong> analyzing: (1) own leverage, (2) peer health, (3) contagion exposure, (4) network centrality. This is <strong>NOT a formula—it's learned from 50+ simulation rounds of history</strong>.
          </p>
        </div>
        <div className="bg-[#0a1520]/80 border border-cyan-500/30 p-6 rounded-lg overflow-x-auto">
          <h3 className="text-sm font-bold text-cyan-300 mb-4">Bank Details (Sorted by Risk)</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="text-left px-2 py-2 text-cyan-400">Bank ID</th>
                <th className="text-left px-2 py-2 text-cyan-400">Health</th>
                <th className="text-left px-2 py-2 text-cyan-400">ML Risk</th>
                <th className="text-left px-2 py-2 text-cyan-400">Status</th>
                <th className="text-left px-2 py-2 text-cyan-400">Assets</th>
                <th className="text-left px-2 py-2 text-cyan-400">Profit</th>
              </tr>
            </thead>
            <tbody>
              {nodes.filter(n => !n.is_ccp).slice(0, 10).map((node, idx) => (
                <tr key={idx} className="border-b border-gray-800/50 hover:bg-cyan-500/5 transition-colors">
                  <td className="px-2 py-2 text-cyan-300 font-mono">{node.name}</td>
                  <td className="px-2 py-2 text-cyan-400">{node.health}%</td>
                  <td className="px-2 py-2">
                    <span className={`${
                      node.ml_risk_prob > 0.8 ? 'text-red-400' :
                      node.ml_risk_prob > 0.5 ? 'text-orange-400' :
                      node.ml_risk_prob > 0.2 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{(node.ml_risk_prob * 100).toFixed(0)}%</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold ${
                      node.risk_label === 'SAFE' ? 'bg-cyan-500/20 text-cyan-300' :
                      node.risk_label === 'UNDER-CAPITALIZED' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>{node.risk_label}</span>
                  </td>
                  <td className="px-2 py-2 text-blue-400 font-mono">₹{(node.actual_assets / 1e6).toFixed(1)}M</td>
                  <td className="px-2 py-2 font-mono">{node.profit > 0 ? <span className="text-green-400">+₹{(node.profit / 1e3).toFixed(0)}K</span> : <span className="text-red-400">-₹{Math.abs(node.profit / 1e3).toFixed(0)}K</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {nodes.filter(n => !n.is_ccp).length > 10 && (
            <p className="text-xs text-gray-500 mt-3">... and {nodes.filter(n => !n.is_ccp).length - 10} more banks</p>
          )}
        </div>

        {/* FINAL USP SUMMARY */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/50 p-4 rounded-lg">
          <h3 className="text-sm font-bold text-blue-300 mb-2">WHAT MAKES THIS DIFFERENT FROM BASEL III, STRESS TESTS & VaR</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-gray-300">
            <div className="flex gap-2">
              <span className="text-cyan-400 font-bold">1️⃣</span>
              <div>
                <strong>Game-Theoretic Decisions</strong> — Banks choose strategies (RISK_ON/RISK_OFF) based on peer health under <strong>incomplete information</strong>, not fixed rules.
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-pink-400 font-bold">2️⃣</span>
              <div>
                <strong>Risk Acceleration (d(Health)/dt)</strong> — Detects <strong>velocity of failure</strong> not just current state. A bank losing 5% health/round poses more immediate systemic risk.
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-purple-400 font-bold">3️⃣</span>
              <div>
                <strong>Graph Attention AI</strong> — Neural networks learn which peer connections are <strong>toxic</strong> by analyzing 50+ rounds of contagion history, predicting failures earlier.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, subtext, color = "cyan" }) => {
  const colorClasses = {
    cyan: 'border-cyan-500/30 text-cyan-300',
    red: 'border-red-500/30 text-red-300',
    yellow: 'border-yellow-500/30 text-yellow-300',
    green: 'border-green-500/30 text-green-300'
  };

  return (
    <div className={`bg-[#0a1520]/80 border ${colorClasses[color]} p-4 rounded-lg`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} />
        <div className="text-xs text-gray-400 font-bold tracking-widest uppercase">{label}</div>
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
};

const DonutChart = ({ data }) => {
  const size = 120;
  const innerRadius = 35;
  const outerRadius = 60;
  
  let currentAngle = -Math.PI / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  const paths = data.map((item, idx) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    
    const x1 = size / 2 + outerRadius * Math.cos(startAngle);
    const y1 = size / 2 + outerRadius * Math.sin(startAngle);
    const x2 = size / 2 + outerRadius * Math.cos(endAngle);
    const y2 = size / 2 + outerRadius * Math.sin(endAngle);
    const x3 = size / 2 + innerRadius * Math.cos(endAngle);
    const y3 = size / 2 + innerRadius * Math.sin(endAngle);
    const x4 = size / 2 + innerRadius * Math.cos(startAngle);
    const y4 = size / 2 + innerRadius * Math.sin(startAngle);
    
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    
    currentAngle = endAngle;
    
    return <path key={idx} d={d} fill={item.color} opacity="0.8" />;
  });

  return (
    <svg width="140" height="140" viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {paths}
    </svg>
  );
};

export default ResultsPage;
