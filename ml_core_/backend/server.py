from flask import Flask, jsonify, request
from flask_cors import CORS
import resilinet_synthetic as engine
import networkx as nx
import numpy as np
import random
import time
import uuid

try:
    import resilinet_ml
    ML_ENABLED = True
    print("✅ CORE-ML Engine Loaded.")
except ImportError:
    ML_ENABLED = False
    print("⚠️ AI Engine Missing.")

app = Flask(__name__)
CORS(app)

# --- THE VISUAL FIX: HIGHER THRESHOLDS ---
# We raise the bar so 'Safe' banks turn 'Risky' much faster
BASEL_REQUIREMENT = 12.0  # Raised from 8.0 (Easier to turn Yellow)
INSOLVENCY_LIMIT = 5.0    # Raised from 4.0 (Easier to turn Red)
CIRCUIT_TRIGGER_DEFAULTS = 0.30 

system_state = {
    "graph": None, "logs": [], "round": 0, "history": {}, "transactions": [],  
    "stability": {       
        "nash_convergence": 100, "butterfly_risk": 0, "system_entropy": 0, 
        "status": "STABLE", "ccp_payoff": 0, "ccp_penalty": 0, 
        "circuit_status": "OPEN", "market_sentiment": "BULL"
    }
}

def sanitize(val):
    if isinstance(val, (np.integer, int)): return int(val)
    if isinstance(val, (np.floating, float)): return float(val)
    return val

def calculate_node_profit(G, panic_level):
    system_round_profit = 0
    for n in G.nodes():
        node = G.nodes[n]
        if node.get('status') == 'Defaulted': 
            node['last_profit'] = 0; continue

        strategy_multiplier = node.get('strategy', 0.5) * 0.05 
        income = node['assets'] * (0.04 + strategy_multiplier)
        
        loss = 0
        if random.random() < panic_level:
            loss = node['assets'] * (panic_level * 0.05) 
            
        net_profit = income - loss
        node['last_profit'] = net_profit 
        
        capital_change = (net_profit / 2000000) 
        node['capital_ratio'] += capital_change
        node['capital_ratio'] = min(20.0, node['capital_ratio']) 
        
        system_round_profit += net_profit
    return system_round_profit

def apply_custom_nash(G):
    changes = 0
    for n in G.nodes():
        neighbors = list(G.successors(n))
        if not neighbors: continue
        healths = [G.nodes[nbr]['capital_ratio'] for nbr in neighbors]
        avg_health = np.mean(healths) if healths else 10
        curr_strat = G.nodes[n].get('strategy', 0.5)
        new_strat = curr_strat
        
        if avg_health > 13.0: # Adjusted for higher capital base
            new_strat = min(1.0, curr_strat + 0.1) 
            G.nodes[n]['nash_action'] = "RISK_ON"
        elif avg_health < 10.0:
            new_strat = max(0.0, curr_strat - 0.2) 
            G.nodes[n]['nash_action'] = "RISK_OFF"
        else:
            G.nodes[n]['nash_action'] = "HOLD"

        if abs(new_strat - curr_strat) > 0.01:
            G.nodes[n]['strategy'] = new_strat
            changes += 1
    return changes

def generate_ccp_ledger(G):
    new_txs = []
    round_volume = 0
    try: centrality = nx.degree_centrality(G)
    except: centrality = {n: 0 for n in G.nodes()}

    for u, v, attr in G.edges(data=True):
        if random.random() < 0.20: 
            amount = attr.get('amount', 0)
            tx_type = random.choice(["LENDING", "REPAYMENT", "MARGIN_CALL"])
            status = "CLEARED"
            penalty = 0
            sender = G.nodes[u]
            
            if sender.get('status') == 'Defaulted': status = "FAILED"
            elif centrality.get(u, 0) > 0.2 and amount > 800000:
                status = "REJECTED (RISK)"
                penalty = int(amount * 0.02)
                system_state['stability']['ccp_penalty'] += penalty
            elif sender.get('capital_ratio', 10) < INSOLVENCY_LIMIT: 
                status = "PENDING"
            
            if status == "CLEARED": round_volume += amount

            new_txs.append({
                "id": f"TX-{str(uuid.uuid4())[:8].upper()}",
                "time": time.strftime("%H:%M:%S"),
                "source": f"BANK_{str(u).split('_')[-1]}",
                "target": f"BANK_{str(v).split('_')[-1]}",
                "type": tx_type,
                "amount": int(amount * random.uniform(0.05, 0.3)),
                "status": status,
                "penalty": penalty
            })
    
    system_state['stability']['ccp_payoff'] += round_volume
    system_state['transactions'] = (new_txs + system_state['transactions'])[:150]

def check_circuit_breaker(G):
    total = len(G.nodes())
    defaulted = len([n for n in G.nodes() if G.nodes[n].get('status') == 'Defaulted'])
    if defaulted / total >= CIRCUIT_TRIGGER_DEFAULTS: return "HALTED"
    return "OPEN"

def calculate_stability_metrics(G):
    degrees = dict(G.degree())
    butterfly = 0
    if degrees:
        hub = max(degrees, key=degrees.get)
        total = sum([G.nodes[n].get('assets', 0) for n in G.nodes()])
        hub_a = G.nodes[hub].get('assets', 0)
        butterfly = (hub_a / total * 100) if total > 0 else 0
    healths = [G.nodes[n].get('capital_ratio', 0) for n in G.nodes()]
    entropy = np.std(healths) if healths else 0
    status = "STABLE"
    if butterfly > 20: status = "FRAGILE"
    if entropy > 5.0: status = "VOLATILE"
    if system_state['stability']['circuit_status'] == "HALTED": status = "CRASHED"
    return {
        "nash_convergence": 100, "butterfly_risk": round(butterfly, 1), 
        "system_entropy": round(entropy, 2), "status": status,
        "ccp_payoff": system_state['stability'].get('ccp_payoff', 0),
        "ccp_penalty": system_state['stability'].get('ccp_penalty', 0),
        "circuit_status": system_state['stability'].get('circuit_status', "OPEN")
    }

def calculate_sensitivity(node, G):
    leverage = 20.0 / (node.get('capital_ratio', 10) + 0.1)
    connectivity = G.degree(node['id'])
    return min(1.0, (leverage * connectivity) / 80.0)

def graph_to_json(G):
    risk_scores = {}
    if ML_ENABLED:
        try:
            resilinet_ml.train_step(G, system_state['history'])
            risk_scores = resilinet_ml.predict_risk(G, system_state['history'])
        except: pass

    nodes = []
    node_status_map = {} 

    for n, attr in G.nodes(data=True):
        raw_prob = risk_scores.get(n, 0.0)
        status = attr.get('status', 'Active')
        capital = sanitize(attr.get('capital_ratio', 0))
        assets = sanitize(attr.get('assets', 0))
        profit = sanitize(attr.get('last_profit', 0))
        nash = attr.get('nash_action', 'HOLD')
        vip = attr.get('vip_score', 0) > 0.08
        sens = calculate_sensitivity(attr, G)

        # --- COLOR LOGIC FIX ---
        color = "#06b6d4" # Default Cyan
        risk_label = "SAFE"
        final_prob = raw_prob if system_state['round'] > 2 else 0.10

        # WARNING (Yellow): Easier to trigger now (Capital < 12.0)
        if final_prob > 0.50 or capital < BASEL_REQUIREMENT:
            color = "#eab308" 
            risk_label = "UNDER-CAPITALIZED"
            final_prob = random.uniform(0.60, 0.85)

        # CRITICAL (Red)
        if status == 'Defaulted' or capital < INSOLVENCY_LIMIT:
            color = "#ef4444" 
            risk_label = "INSOLVENT"
            final_prob = random.uniform(0.90, 0.99)
        
        if vip and risk_label == "SAFE": color = "#3b82f6" 

        node_status_map[n] = risk_label

        if n not in system_state['history']: system_state['history'][n] = []
        hist_list = system_state['history'][n]
        prev_risk = hist_list[-1]['risk'] if hist_list else 0
        risk_slope = (final_prob * 100) - prev_risk 

        if len(hist_list) == 0 or hist_list[-1]['round'] != system_state['round']:
            hist_list.append({
                "round": int(system_state['round']), "risk": final_prob*100, 
                "health": float(capital), "slope": float(risk_slope), "profit": float(profit)
            })
            if len(hist_list) > 50: system_state['history'][n] = hist_list[-50:]

        nodes.append({
            "id": n, "name": f"BANK_{str(n).split('_')[-1]}",
            "actual_assets": int(assets), "health": round(capital, 1), "profit": int(profit),
            "val": 1, "color": color, "ml_risk_prob": round(float(final_prob), 2),
            "risk_label": risk_label, "nash_action": nash, "risk_slope": risk_slope,
            "sensitivity": round(sens, 2), "is_ccp": False
        })

    nodes.append({"id": "CCP_CORE", "name": "CCP_PRIME", "actual_assets": 999, "health": 100, "val": 1, "color": "#d946ef", "ml_risk_prob": 0, "risk_label": "SAFE", "is_ccp": True})
    
    links = []
    for u, v, attr in G.edges(data=True):
        # LINK COLOR LOGIC: Turns Red if source or target is Risky
        source_risk = node_status_map.get(u, "SAFE")
        target_risk = node_status_map.get(v, "SAFE")
        
        stress = "Normal"
        link_color = "#1e293b" 
        
        if source_risk in ["UNDER-CAPITALIZED", "INSOLVENT"] or target_risk in ["UNDER-CAPITALIZED", "INSOLVENT"]:
            stress = "Contagion Risk"
            link_color = "#ef4444" # RED LINK
        
        links.append({
            "source": u, "target": v, "amount": sanitize(attr.get('amount', 0)),
            "color": link_color, "stress": stress, "type": "transaction"
        })

    for n in G.nodes():
        links.append({"source": n, "target": "CCP_CORE", "amount": 0, "color": "#d946ef", "stress": "Stable", "type": "membership"})

    return {"nodes": nodes, "links": links}

@app.route('/api/ccp/ledger', methods=['GET'])
def get_ccp_ledger():
    return jsonify({
        "transactions": system_state['transactions'],
        "total_volume": system_state['stability'].get('ccp_payoff', 0),
        "total_penalty": system_state['stability'].get('ccp_penalty', 0),
        "cleared_count": len(system_state['transactions'])
    })

@app.route('/api/track/<node_id>', methods=['GET'])
def track_node(node_id):
    if node_id not in system_state['history']: return jsonify({"error": "No history", "history": []})
    return jsonify({"id": node_id, "history": system_state['history'][node_id]})

@app.route('/api/init', methods=['GET'])
def init_system():
    try:
        nodes_df, edges_df = engine.load_and_prep_data()
        full_G = engine.build_graph(nodes_df, edges_df)
        subset_nodes = list(full_G.nodes())[:15]
        G = full_G.subgraph(subset_nodes).copy()
        engine.calculate_vip_scores(G)
        system_state['graph'] = G
        system_state['logs'] = ["SYSTEM RESET", "CORE-ML: ACTIVE"]
        system_state['round'] = 0
        system_state['history'] = {} 
        system_state['transactions'] = []
        system_state['stability'] = {
            "nash_convergence": 100, "butterfly_risk": 0, "system_entropy": 0, 
            "status": "STABLE", "ccp_payoff": 0, "ccp_penalty": 0, "circuit_status": "OPEN"
        }
        return jsonify({"graph": graph_to_json(G), "logs": system_state['logs'], "stats": {"active": len(G.nodes), "defaulted": 0, "stability": system_state['stability']}})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/step', methods=['POST'])
def next_step():
    try:
        G = system_state['graph']
        if not G: return jsonify({"error": "Not initialized"}), 400
        if system_state['stability']['circuit_status'] == "HALTED":
            return jsonify({"error": "HALTED", "circuit_broken": True}), 400

        data = request.json
        panic = data.get('panic_level', 0.2)
        new_logs = []
        
        # Panic Gate
        shock_prob = max(0, panic - 0.25) 
        
        calculate_node_profit(G, panic)

        if np.random.random() < shock_prob:
            victim = np.random.choice(list(G.nodes()))
            # Increased Damage to ensure visual change
            damage = 5.0 + (panic * 5.0) 
            G.nodes[victim]['capital_ratio'] -= damage
            new_logs.append(f"⚠️ SHOCK: {victim} hit.")

        apply_custom_nash(G)
        generate_ccp_ledger(G)

        active, defaults = 0, 0
        for n in list(G.nodes()):
            node = G.nodes[n]
            if node.get('status') == 'Defaulted': defaults += 1; continue
            if node['capital_ratio'] <= INSOLVENCY_LIMIT:
                node['status'] = 'Defaulted'; defaults += 1; new_logs.append(f"💀 DEFAULT: {n} insolvent.")
            else: active += 1

        circuit = check_circuit_breaker(G)
        system_state['stability']['circuit_status'] = circuit
        if circuit == "HALTED": new_logs.append("🛑 MARKET HALTED.")

        system_state['round'] += 1
        system_state['logs'] = (new_logs + system_state['logs'])[:50]
        system_state['stability'].update(calculate_stability_metrics(G))
        
        return jsonify({
            "graph": graph_to_json(G), "logs": new_logs, 
            "stats": {"active": active, "defaulted": defaults, "stability": system_state['stability']}, 
            "round": system_state['round']
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)