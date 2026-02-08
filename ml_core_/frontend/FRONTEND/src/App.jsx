import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ForceGraph2D from 'react-force-graph-2d';
import ResultsPage from './ResultsPage';
import { 
  Play, RotateCcw, Activity, Cpu, Crosshair, Zap, Wifi, 
  TrendingUp, List, X, AlertTriangle, Anchor, Wind, 
  Database, Info, Shield, Sword, FileText, Lock, Unlock,
  Bomb, Wallet, Terminal, Maximize, BarChart3
} from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function App() {
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ 
      active: 0, defaulted: 0, 
      stability: { 
          nash_convergence: 100, butterfly_risk: 0, system_entropy: 0, 
          status: "STABLE", ccp_payoff: 0, ccp_penalty: 0, circuit_status: "OPEN" 
      } 
  });
  const [round, setRound] = useState(0);
  const [panic, setPanic] = useState(0.2); 
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [trackedNode, setTrackedNode] = useState(null);
  const [trackHistory, setTrackHistory] = useState([]);
  
  const [showCCPLedger, setShowCCPLedger] = useState(false);
  const [ccpData, setCcpData] = useState({ transactions: [], total_volume: 0, total_penalty: 0, cleared_count: 0 });
  const [showStabilityInfo, setShowStabilityInfo] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const graphWrapperRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const fgRef = useRef();

  useEffect(() => {
    const handleResize = () => {
        if (graphWrapperRef.current) {
            const { width, height } = graphWrapperRef.current.getBoundingClientRect();
            setDimensions({ width, height });
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    if (graphWrapperRef.current) observer.observe(graphWrapperRef.current);
    return () => {
        window.removeEventListener('resize', handleResize);
        observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2500); 
    return () => clearTimeout(timer);
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/init`);
      if (res.data) {
          setGraph(res.data.graph || { nodes: [], links: [] });
          setLogs(res.data.logs || []);
          setStats(res.data.stats || stats);
          setRound(0);
          setTrackedNode(null);
          setTrackHistory([]);
          setShowCCPLedger(false);
      }
    } catch (e) { console.error("Backend offline."); } finally { setLoading(false); }
  }, []);

  const nextStep = async () => {
    if (stats.stability.circuit_status === "HALTED") return;
    try {
      const res = await axios.post(`${API}/step`, { panic_level: panic });
      if (res.data) {
          setGraph(res.data.graph);
          setLogs(prev => [...(res.data.logs || []), ...prev]);
          setStats(res.data.stats);
          setRound(res.data.round);
          if (trackedNode) {
             const updatedNode = res.data.graph.nodes.find(n => n.id === trackedNode.id);
             if (updatedNode) setTrackedNode(updatedNode);
             fetchHistory(trackedNode.id);
          }
          if (showCCPLedger) fetchCCPData();
      }
    } catch (e) { console.error("Step failed."); }
  };

  const fetchHistory = async (nodeId) => {
      try {
          const res = await axios.get(`${API}/track/${nodeId}`);
          setTrackHistory(res.data.history || []);
      } catch (e) {}
  };

  const fetchCCPData = async () => {
      try {
          const res = await axios.get(`${API}/ccp/ledger`);
          setCcpData(res.data);
      } catch (e) {}
  };

  const handleNodeClick = (node) => {
      if (!node) return;
      if (node.is_ccp) {
          setShowCCPLedger(true);
          fetchCCPData();
          setTrackedNode(null);
      } else {
          setTrackedNode(node);
          fetchHistory(node.id);
          setShowCCPLedger(false);
      }
  };

  const fitGraph = () => {
      if (fgRef.current) {
          fgRef.current.zoomToFit(400, 50); 
      }
  }

  useEffect(() => { init(); }, [init]);

  // --- PHYSICS & ZOOM FIX ---
  useEffect(() => {
    if (fgRef.current) {
      // Balanced Repulsion (Not too explody)
      fgRef.current.d3Force('charge').strength(-2000); 
      fgRef.current.d3Force('link').distance(link => link.type === 'membership' ? 180 : 100);
      fgRef.current.d3Force('center').strength(0.2);
      
      // Auto-fit once on load
      setTimeout(() => fitGraph(), 800);
    }
  }, [graph]);

  if (showIntro) return <IntroScreen />;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#020408] text-cyan-50 overflow-hidden relative fade-in">
      {showResults && <ResultsPage graph={graph} stats={stats} round={round} onClose={() => setShowResults(false)} />}
      
      <header className="h-16 px-6 border-b border-cyan-900/50 flex justify-between items-center bg-[#050a14] z-20 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-cyan-500/10 rounded border border-cyan-500/50">
             <Cpu className="text-cyan-400" size={20} />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter text-white">
              RESILINET <span className="text-xs bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500 font-bold tracking-widest ml-1 border border-pink-500/30 px-1 rounded">CORE-ML</span>
            </h1>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-1 rounded bg-black border ${stats.stability.circuit_status === "HALTED" ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "border-gray-800"}`}>
            {stats.stability.circuit_status === "OPEN" ? (
                <><Unlock size={14} className="text-green-500"/><span className="text-[10px] text-green-500 font-bold tracking-widest">MARKET OPEN</span></>
            ) : (
                <><Lock size={14} className="text-red-500 animate-pulse"/><span className="text-[10px] text-red-500 font-bold tracking-widest animate-pulse">TRADING HALTED</span></>
            )}
        </div>
        <div className="flex gap-8 items-center">
          <div className="flex flex-col w-40 group">
             <span className="text-[9px] text-cyan-600 font-bold tracking-widest mb-1 flex justify-between">
                <span>MARKET PANIC</span><span>{(panic * 100).toFixed(0)}%</span>
             </span>
             <div className="relative h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300" style={{width: `${panic * 100}%`}}></div>
                <input type="range" min="0" max="1" step="0.1" value={panic} onChange={e => setPanic(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer"/>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={nextStep} 
                disabled={stats.stability.circuit_status === "HALTED"}
                className={`px-6 py-2 rounded-sm border transition-all flex items-center gap-2 text-xs font-bold tracking-wider active:scale-95 ${
                    stats.stability.circuit_status === "HALTED" 
                    ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed opacity-50"
                    : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                }`}
            >
                <Play size={14}/> EXECUTE
            </button>
            <button 
                onClick={() => setShowResults(true)} 
                className="px-4 py-2 rounded-sm border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all flex items-center gap-2 text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
                <BarChart3 size={14}/> RESULTS
            </button>
            <button onClick={init} className="p-2 text-gray-500 hover:text-white hover:rotate-180 transition-all duration-500"><RotateCcw size={18}/></button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-56 border-r border-cyan-900/30 bg-[#050a14] flex flex-col z-20 shrink-0 font-mono">
            <div className="p-3 border-b border-cyan-900/30 text-[10px] font-bold text-cyan-500 flex items-center gap-2"><List size={12}/> NETWORK NODES</div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-cyan-900/50">
                {graph.nodes.filter(n => !n.is_ccp).map(n => (
                    <div key={n.id} onClick={() => handleNodeClick(n)} className={`cursor-pointer px-3 py-2 rounded border transition-all flex justify-between items-center group ${trackedNode?.id === n.id ? 'bg-cyan-900/40 border-cyan-500/50 text-white' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}`}>
                        <span className="text-[10px]">{n.name}</span>
                        <div className={`w-2 h-2 rounded-full ${n.color === '#ef4444' ? 'bg-red-500' : n.color === '#eab308' ? 'bg-yellow-500' : 'bg-cyan-500'}`}></div>
                    </div>
                ))}
            </div>
        </div>

        <div ref={graphWrapperRef} className="flex-1 relative bg-[#020408] overflow-hidden font-mono p-0 m-0">
          {!loading && graph.nodes.length > 0 ? (
            <ForceGraph2D 
              ref={fgRef} 
              graphData={graph} 
              backgroundColor="#020408" 
              width={dimensions.width} 
              height={dimensions.height}
              linkColor={() => "#1e293b"}
              enableZoom={true} // ENABLED
              enablePan={true}  // ENABLED
              
              nodeCanvasObject={(node, ctx, globalScale) => {
                const isHovered = hoveredNode && hoveredNode.id === node.id;
                const isTracked = trackedNode && trackedNode.id === node.id;
                const r = node.is_ccp ? 10 : 5; // Medium Size
                const color = node.color; // Comes from backend logic (Fixed in server.py)

                // Strong Glow Interaction
                if (isTracked || isHovered) {
                    ctx.shadowColor = color; 
                    ctx.shadowBlur = 30; 
                    ctx.beginPath(); 
                    ctx.arc(node.x, node.y, r * 2, 0, 2 * Math.PI, false); 
                    ctx.strokeStyle = color; 
                    ctx.lineWidth = 2; 
                    ctx.stroke();
                }
                
                // Node Body
                ctx.shadowColor = color; 
                ctx.shadowBlur = 10; 
                ctx.beginPath(); 
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false); 
                ctx.fillStyle = color; 
                ctx.fill();
                
                if (node.is_ccp) {
                    ctx.beginPath(); ctx.arc(node.x, node.y, r * 0.6, 0, 2 * Math.PI, false); ctx.fillStyle = '#fff'; ctx.fill();
                }
                
                if (isHovered || node.is_ccp || isTracked) {
                   const label = node.is_ccp ? "CCP PRIME" : `BK-${node.id}`;
                   ctx.font = `bold ${14/globalScale}px monospace`; 
                   ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(label, node.x, node.y - r - 8);
                }
              }}
              
              linkCanvasObject={(link, ctx) => {
                const isHovered = hoveredLink === link;
                const isMembership = link.type === 'membership';
                const isRisk = link.color === '#ef4444'; // Check exact color code for risk
                
                const isConnected = (hoveredNode && (link.source.id === hoveredNode.id || link.target.id === hoveredNode.id)) || 
                                    (trackedNode && (link.source.id === trackedNode.id || link.target.id === trackedNode.id));

                if (isMembership && !isHovered && !isConnected) return;

                ctx.beginPath(); 
                ctx.moveTo(link.source.x, link.source.y); 
                ctx.lineTo(link.target.x, link.target.y);
                
                if (isHovered || isConnected) { 
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowColor = '#fff'; ctx.shadowBlur = 15; 
                } 
                else if (isRisk) { 
                    // RESTORED NEON RED LINES
                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 15; 
                } 
                else { 
                    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.shadowBlur = 0; 
                }
                ctx.stroke();
              }}
              onNodeClick={handleNodeClick} onNodeHover={node => setHoveredNode(node || null)} onLinkHover={link => setHoveredLink(link || null)}
            />
          ) : ( <div className="h-full flex flex-col items-center justify-center text-cyan-900 animate-pulse gap-4"><Activity size={48}/> <div className="text-xs tracking-[0.5em]">INITIALIZING NEURAL LATTICE...</div></div> )}
          
          <div className="absolute bottom-6 left-6 z-20">
              <button onClick={fitGraph} className="bg-black/50 border border-gray-700 p-2 rounded hover:bg-white/10 hover:border-cyan-500 transition-all text-cyan-500" title="Auto Fit Graph">
                  <Maximize size={20} />
              </button>
          </div>

          {/* ... (Metrics, Stability Matrix, Ledger, Trace, Logs - Same as before) ... */}
          <div className="absolute top-6 left-6 space-y-2 pointer-events-none">
             <MetricCard label="SIMULATION TIME" value={`T-${round.toString().padStart(4, '0')}`} />
             <div className="flex gap-2">
                <MetricCard label="ACTIVE NODES" value={stats.active} color="text-cyan-400" />
                <MetricCard label="FAILURES" value={stats.defaulted} color="text-red-500" />
             </div>
          </div>

          <div className="absolute bottom-32 right-6 w-72 bg-[#050a14]/90 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl p-4 z-40 transition-all hover:border-cyan-500/60 font-mono">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-cyan-500/20">
                  <h3 className="text-xs font-black text-white flex items-center gap-2 tracking-wider"><Anchor size={14} className="text-cyan-400"/> STABILITY MATRIX</h3>
                  <div className="flex gap-2 items-center">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${stats?.stability?.status === 'STABLE' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'}`}>{stats?.stability?.status || "ANALYZING"}</span>
                      <button onClick={() => setShowStabilityInfo(!showStabilityInfo)} className="text-gray-500 hover:text-white"><Info size={14}/></button>
                  </div>
              </div>
              
              {showStabilityInfo ? (
                  <div className="text-[10px] text-gray-300 space-y-2 animate-in fade-in slide-in-from-right-2">
                      <p className="border-l-2 border-green-500 pl-2"><strong className="text-green-400 block">System Payoff</strong> Total wealth generated by cleared transactions.</p>
                      <p className="border-l-2 border-red-500 pl-2"><strong className="text-red-400 block">Circuit Breaker</strong> Halts trading if failures > 30%.</p>
                      <button onClick={() => setShowStabilityInfo(false)} className="w-full mt-2 bg-white/10 py-1 rounded text-center hover:bg-white/20">RETURN</button>
                  </div>
              ) : (
                  <div className="space-y-3 animate-in fade-in">
                      <div>
                          <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                              <span>SYSTEM PAYOFF (Vol)</span>
                              <span className="text-green-400 font-mono">₹{(stats?.stability?.ccp_payoff || 0).toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500/20 transition-all duration-500" style={{width: '100%'}}>
                                  <div className="h-full bg-green-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (stats?.stability?.ccp_payoff / 10000000) * 10)}%` }}></div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-gray-900/80 p-2 rounded border border-gray-700">
                              <div className="flex items-center gap-1 text-gray-500 mb-1"><Wind size={10}/> BUTTERFLY IDX</div>
                              <div className={`text-lg font-mono ${stats?.stability?.butterfly_risk > 10 ? 'text-red-400' : 'text-white'}`}>{stats?.stability?.butterfly_risk}%</div>
                          </div>
                          <div className="bg-gray-900/80 p-2 rounded border border-gray-700">
                              <div className="flex items-center gap-1 text-gray-500 mb-1"><TrendingUp size={10}/> ENTROPY</div>
                              <div className="text-lg font-mono text-white">{stats?.stability?.system_entropy}</div>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {showCCPLedger && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-in fade-in duration-200">
                  <div className="w-full max-w-5xl h-full max-h-[85vh] bg-[#050810] border border-pink-500/40 rounded-lg shadow-[0_0_80px_rgba(236,72,153,0.15)] flex flex-col overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent"></div>
                      <div className="p-6 border-b border-pink-500/20 flex justify-between items-center bg-pink-900/5">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-pink-500/10 rounded border border-pink-500/50 text-pink-400"><Database size={24}/></div>
                              <div>
                                  <h2 className="text-2xl font-black text-white tracking-widest flex items-center gap-3">
                                      CCP_PRIME <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-1 rounded border border-pink-500/50">LIVE LEDGER</span>
                                  </h2>
                                  <div className="text-xs text-gray-500 font-mono mt-1">CENTRAL CLEARING PAYOFF TRACKER // ENCRYPTED</div>
                              </div>
                          </div>
                          <div className="flex gap-6 items-end">
                              <div className="text-right">
                                  <div className="text-[10px] text-red-500 font-bold mb-1 flex items-center justify-end gap-1"><Wallet size={10}/> PENALTY WALLET</div>
                                  <div className="text-xl font-mono text-red-400">₹{stats.stability.ccp_penalty.toLocaleString()}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-[10px] text-green-500 font-bold mb-1">TOTAL PAYOFF</div>
                                  <div className="text-2xl font-mono text-green-400">₹{ccpData.total_volume.toLocaleString()}</div>
                              </div>
                              <button onClick={() => setShowCCPLedger(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"><X size={24}/></button>
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-900/50">
                          <table className="w-full text-left border-collapse font-mono">
                              <thead className="bg-[#0a0f1e] sticky top-0 z-10 shadow-lg">
                                  <tr className="text-[10px] text-gray-400 font-bold tracking-wider border-b border-gray-800">
                                      <th className="p-4">TX_HASH</th>
                                      <th className="p-4">TIME</th>
                                      <th className="p-4">SOURCE</th>
                                      <th className="p-4">TARGET</th>
                                      <th className="p-4">TYPE</th>
                                      <th className="p-4 text-right">AMOUNT</th>
                                      <th className="p-4 text-center">STATUS</th>
                                  </tr>
                              </thead>
                              <tbody className="font-mono text-xs divide-y divide-gray-800/50">
                                  {ccpData.transactions.map((tx, i) => (
                                      <tr key={i} className="hover:bg-pink-500/5 transition-colors group">
                                          <td className="p-4 text-gray-600 group-hover:text-pink-300 transition-colors">{tx.id}</td>
                                          <td className="p-4 text-gray-400">{tx.time}</td>
                                          <td className="p-4 text-cyan-300">{tx.source}</td>
                                          <td className="p-4 text-cyan-300">{tx.target}</td>
                                          <td className="p-4 text-yellow-500/80">{tx.type}</td>
                                          <td className="p-4 text-right text-white font-bold">₹{tx.amount.toLocaleString()}</td>
                                          <td className="p-4 text-center">
                                              <span className={`px-2 py-1 rounded text-[9px] font-bold border ${tx.status === 'CLEARED' ? 'bg-green-900/20 text-green-400 border-green-500/30' : tx.status.includes('REJECTED') ? 'bg-pink-900/20 text-pink-400 border-pink-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>{tx.status}</span>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {trackedNode && (
            <div className="absolute top-6 right-6 w-96 bg-[#0a0f1e]/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg shadow-2xl animate-in slide-in-from-right-10 z-30 font-mono">
               <div className="flex items-center justify-between border-b border-cyan-800/50 pb-2 mb-4 p-4 bg-cyan-900/10">
                  <h3 className="text-sm font-black text-cyan-400 flex items-center gap-2 tracking-widest"><TrendingUp size={16}/> NEURAL TRACE</h3>
                  <button onClick={() => setTrackedNode(null)} className="text-gray-500 hover:text-white text-xs">[CLOSE]</button>
               </div>
               
               <div className="p-4 pt-0 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                        <div className="text-[10px] text-cyan-600 font-bold uppercase">TARGET ENTITY</div>
                        <div className="text-2xl font-mono text-white tracking-tighter">{trackedNode.name}</div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded border ${trackedNode.color === '#ef4444' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'}`}>{trackedNode.risk_label}</div>
                  </div>

                  <div className={`flex justify-between items-center p-2 rounded border ${trackedNode.sensitivity > 0.8 ? 'bg-red-900/20 border-red-500/50' : 'bg-gray-900/50 border-gray-700/50'}`}>
                      <div className="flex items-center gap-2">
                          <Bomb size={14} className={trackedNode.sensitivity > 0.8 ? "text-red-500 animate-pulse" : "text-gray-500"}/>
                          <div className="text-[10px] font-bold text-gray-400">SENSITIVITY (BOMB)</div>
                      </div>
                      <div className="text-xs font-mono font-bold text-white">{trackedNode.sensitivity} / 1.0</div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700/50">
                      <div className="text-[10px] text-gray-400 font-bold">NET PROFIT (PnL)</div>
                      <div className={`text-xs font-mono font-bold flex items-center gap-1 ${trackedNode.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trackedNode.profit >= 0 ? '+' : ''}₹{trackedNode.profit?.toLocaleString() || 0}
                      </div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700/50">
                      <div className="text-[10px] text-gray-400 font-bold">NASH STRATEGY</div>
                      <div className="flex items-center gap-2">
                          {trackedNode.nash_action === 'RISK_ON' && <Sword size={12} className="text-cyan-400"/>}
                          {trackedNode.nash_action === 'RISK_OFF' && <Shield size={12} className="text-yellow-400"/>}
                          <span className="text-xs font-mono text-white">{trackedNode.nash_action || "HOLD"}</span>
                      </div>
                  </div>

                  <div className="bg-black/40 border border-gray-700 h-32 w-full relative rounded-md overflow-hidden group">
                      {trackHistory.length < 2 ? <div className="flex h-full items-center justify-center text-gray-600 text-[10px] animate-pulse">AWAITING TELEMETRY...</div> : <InteractiveChart data={trackHistory} color={trackedNode.color} />}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-gray-900 p-2 rounded border-l-2 border-cyan-500">
                          <span className="text-gray-500 block mb-1">HEALTH METRIC</span>
                          <span className="text-cyan-300 font-mono text-lg">{trackedNode.health}</span>
                      </div>
                      <div className="bg-gray-900 p-2 rounded border-l-2 border-red-500">
                          <span className="text-gray-500 block mb-1">AI PROBABILITY</span>
                          <span className="text-red-300 font-mono text-lg">{trackedNode.ml_risk_prob}%</span>
                      </div>
                  </div>
               </div>
            </div>
          )}
          
          {hoveredLink && !trackedNode && hoveredLink.type && !hoveredLink.type.includes('membership') && (
             <div className="absolute top-24 right-6 w-64 bg-black/90 backdrop-blur border border-cyan-500/30 p-3 rounded z-20 shadow-lg pointer-events-none font-mono">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                    <Wifi size={14} className={hoveredLink.stress === 'High Exposure' ? 'text-red-500' : 'text-green-500'}/> 
                    <span className="text-xs font-bold text-white">{hoveredLink.stress}</span>
                </div>
                <div className="space-y-1 font-mono text-[10px]">
                    <div className="flex justify-between text-gray-400"><span>FROM</span> <span className="text-cyan-300">{hoveredLink.source.id}</span></div>
                    <div className="flex justify-between text-gray-400"><span>TO</span> <span className="text-cyan-300">{hoveredLink.target.id}</span></div>
                    <div className="flex justify-between text-gray-400 pt-1"><span>VOL</span> <span className="text-white">₹{hoveredLink.amount.toLocaleString()}</span></div>
                </div>
             </div>
          )}
        </div>
        
        <div className="absolute bottom-0 left-56 right-0 h-32 bg-gradient-to-t from-[#020408] via-[#020408]/80 to-transparent pointer-events-none flex items-end pl-6 pb-4">
            <div className="w-full max-w-2xl pointer-events-auto">
                <div className="text-[9px] font-bold text-gray-600 tracking-widest mb-2 flex items-center gap-2"><Activity size={10}/> SYSTEM LOGS</div>
                <div className="h-20 overflow-y-auto mask-linear-fade space-y-1 pr-4 font-mono">
                    {logs.map((l, i) => (<div key={i} className="text-[10px] text-cyan-500/80 truncate flex gap-3"><span className="opacity-30">[{new Date().toLocaleTimeString()}]</span><span className={l.includes('SHOCK') ? 'text-yellow-400' : l.includes('COLLAPSE') ? 'text-red-500 font-bold' : 'text-cyan-300'}>{l}</span></div>))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

const IntroScreen = () => (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white z-50 absolute top-0 left-0 crt-effect">
        <div className="flex flex-col items-center animate-pulse-soft">
            <Terminal size={64} className="text-cyan-500 mb-6"/>
            <h1 className="text-4xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 mb-2">
                RESILINET
            </h1>
            <div className="text-xs font-mono text-gray-500 tracking-widest mb-8">INITIALIZING NEURAL LATTICE...</div>
            <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 animate-[scan_2s_linear_infinite]" style={{width: '100%'}}></div>
            </div>
        </div>
    </div>
);

const InteractiveChart = ({ data, color }) => {
    const svgRef = useRef(null);
    const [cursor, setCursor] = useState(null);
    const width = 340; const height = 120; const padding = 5;
    const risks = data.map(d => d.risk);
    const maxVal = 100; const minVal = 0;
    const points = risks.map((val, i) => { const x = (i / (risks.length - 1)) * (width - padding * 2) + padding; const y = height - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2) - padding; return `${x},${y}`; }).join(' ');
    
    let ghostPath = "";
    if (risks.length > 2) {
        const last = risks[risks.length - 1];
        const prev = risks[risks.length - 2];
        const slope = last - prev;
        const nextVal = Math.min(100, Math.max(0, last + slope)); 
        const lastX = width - padding;
        const lastY = height - ((last - minVal) / (maxVal - minVal)) * (height - padding * 2) - padding;
        const nextX = width; 
        const nextY = height - ((nextVal - minVal) / (maxVal - minVal)) * (height - padding * 2) - padding;
        ghostPath = `M${lastX},${lastY} L${nextX},${nextY}`;
    }

    const handleMouseMove = (e) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = width / rect.width; 
        const mouseX = (e.clientX - rect.left) * scaleX;
        const index = Math.round(((mouseX - padding) / (width - padding * 2)) * (risks.length - 1));
        const safeIndex = Math.max(0, Math.min(index, risks.length - 1));
        setCursor({ x, safeIndex, value: risks[safeIndex], round: data[safeIndex].round });
    };

    return (
        <div className="w-full h-full relative cursor-crosshair" onMouseMove={handleMouseMove} onMouseLeave={() => setCursor(null)}>
            <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <defs><linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                <path d={`M${padding},${height} ${points} L${width-padding},${height}`} fill="url(#chartGrad)" />
                <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                {ghostPath && <path d={ghostPath} fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />}
                {cursor && (<><line x1={(cursor.safeIndex / (risks.length - 1)) * (width - padding * 2) + padding} y1="0" x2={(cursor.safeIndex / (risks.length - 1)) * (width - padding * 2) + padding} y2={height} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" /><circle cx={(cursor.safeIndex / (risks.length - 1)) * (width - padding * 2) + padding} cy={height - ((cursor.value - minVal) / (maxVal - minVal)) * (height - padding * 2) - padding} r="4" fill="#fff" stroke={color} strokeWidth="2" /></>)}
            </svg>
            {cursor && (<div className="absolute bg-black/90 text-white text-[10px] p-2 rounded border border-white/20 pointer-events-none z-50 whitespace-nowrap shadow-xl" style={{ left: `${((cursor.safeIndex / (risks.length - 1)) * (width - padding * 2) + padding) / width * 100}%`, top: "20%", transform: 'translate(-50%, 0)' }}><div className="font-bold text-gray-400">ROUND {cursor.round}</div><div className="font-mono text-lg leading-none" style={{color: color}}>{cursor.value.toFixed(1)}%</div></div>)}
        </div>
    );
};

const MetricCard = ({label, value, color="text-white"}) => (
  <div className="bg-[#0a1020]/80 backdrop-blur-sm px-4 py-2 rounded-sm border-l-2 border-cyan-500/50 min-w-[120px]">
    <div className="text-[8px] text-cyan-600 uppercase tracking-widest font-bold">{label}</div>
    <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
  </div>
);