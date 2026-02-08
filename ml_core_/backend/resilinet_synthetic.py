import pandas as pd
import numpy as np
import networkx as nx
import os

# --- SAFE ML LIBRARY CHECK ---
# Checks if Machine Learning libraries are installed.
# If not, it falls back to standard simulation logic without crashing.
try:
    import torch
    import torch.nn.functional as F
    from torch_geometric.nn import GCNConv
    from torch_geometric.data import Data
    from sklearn.preprocessing import StandardScaler
    ML_AVAILABLE = True
except ImportError:
    print("⚠️ ML Libraries (Torch/Geometric) missing. Switching to Logic-Only Core.")
    ML_AVAILABLE = False

# ==========================================
# 1. DATA GENERATION & LOADING (The Economy)
# ==========================================

def load_and_prep_data():
    """
    Loads banking data or generates a synthetic 'Fortress Market' economy.
    """
    if not os.path.exists('network_connections.csv'):
        print("⚠️ Data file not found. Initializing Synthetic 'Fortress'...")
        return generate_fallback_data()

    try:
        edge_df = pd.read_csv('network_connections.csv')
        
        # 1. Identify all unique entities (Nodes)
        lenders = edge_df['lender_id'].unique()
        borrowers = edge_df['borrower_id'].unique()
        all_nodes = sorted(list(set(lenders) | set(borrowers)))
        
        # 2. Build Node Features (The "Wealth" of the banks)
        node_data = []
        for node in all_nodes:
            # Calculate exposure based on how much they are lending out
            outgoing_loans = edge_df[edge_df['lender_id'] == node]['exposure_amount'].sum()
            
            # --- USP: FORTRESS START ---
            # We give them a massive base of 25M + 15x their loans.
            # This creates a "Too Big To Fail" buffer at the start.
            assets = 25000000 + (outgoing_loans * 15) 
            
            # --- USP: HIGH CAPITAL BUFFER ---
            # Banks start with Capital Ratio between 14.0 and 18.0.
            # Yellow Trigger is < 8.0. Red Trigger is < 4.0.
            # This gives them huge runway before showing visual risk.
            capital_ratio = np.random.uniform(14.0, 18.0)
            
            node_data.append({
                'id': node,
                'assets': assets,
                'capital_ratio': capital_ratio,
                'status': 'Active',
                'strategy': 0.5, # 0.0 = Hoard (Fear), 1.0 = Invest (Greed)
                'vip_score': outgoing_loans / 5000000 # Normalized centrality score
            })
        
        nodes_df = pd.DataFrame(node_data)
        return nodes_df, edge_df

    except Exception as e:
        print(f"❌ Critical Data Error: {e}")
        return generate_fallback_data()

def generate_fallback_data():
    """
    Creates a 15-Node 'Fortress' Banking System from scratch if no CSV exists.
    Designed to be robust and stable initially.
    """
    nodes = [f"BANK_{i:03d}" for i in range(15)]
    edges = []
    
    # Create a dense network (40 connections for high complexity)
    for _ in range(40):
        u, v = np.random.choice(nodes, 2, replace=False)
        edges.append({
            'lender_id': u, 
            'borrower_id': v,
            'exposure_amount': np.random.randint(50000, 2000000), # Large transactions
            'interest_rate': np.random.uniform(0.02, 0.05)        # Low interest (Stable)
        })
    
    nodes_data = []
    for n in nodes:
        nodes_data.append({
            'id': n, 
            # Very Rich Banks (30M - 80M Assets)
            'assets': np.random.randint(30000000, 80000000), 
            # Extremely Safe Health (14.5 - 18.5)
            'capital_ratio': np.random.uniform(14.5, 18.5),  
            'status': 'Active', 
            'strategy': 0.6, # Slightly aggressive start
            'vip_score': np.random.random()
        })
        
    return pd.DataFrame(nodes_data), pd.DataFrame(edges)

# ==========================================
# 2. GRAPH TOPOLOGY BUILDER
# ==========================================

def build_graph(nodes_df, edges_df):
    """
    Converts DataFrames into a NetworkX Directional Graph.
    This graph is the "Single Source of Truth" for the simulation.
    """
    G = nx.DiGraph()
    
    # 1. Add Nodes with all attributes
    for _, row in nodes_df.iterrows():
        G.add_node(row['id'], **row.to_dict())
        
    # 2. Add Edges (Loans/Transactions)
    for _, row in edges_df.iterrows():
        G.add_edge(
            row['lender_id'], 
            row['borrower_id'], 
            amount=row['exposure_amount'],
            interest=row['interest_rate']
        )
    return G

# ==========================================
# 3. ANALYTICS & SCORING ENGINES
# ==========================================

def calculate_vip_scores(G):
    """
    Calculates how "Important" a bank is.
    Used for UI Sizing (Larger nodes = More important).
    """
    for n in G.nodes():
        assets = G.nodes[n].get('assets', 0)
        degree = G.degree(n)
        
        # Score = Asset Wealth + Connectivity
        # Denominator increased to 80M to account for new massive assets
        score = (assets / 80000000) + (degree * 0.03)
        G.nodes[n]['vip_score'] = score

def run_nash_step(G):
    """
    BASIC Nash Equilibrium Logic.
    (The advanced logic is in server.py, this is a fallback).
    """
    changes = 0
    for n in G.nodes():
        neighbors = list(G.successors(n))
        if not neighbors: continue
        
        # Check health of borrowers
        avg_health = np.mean([G.nodes[nbr]['capital_ratio'] for nbr in neighbors])
        curr = G.nodes[n]['strategy']
        
        # If neighbors are safe (>8.0), we increase risk appetite
        # If neighbors are risky (<8.0), we hoard cash
        new_strat = max(0.0, curr - 0.1) if avg_health < 8.0 else min(1.0, curr + 0.1)
        
        if abs(new_strat - curr) > 0.05:
            G.nodes[n]['strategy'] = new_strat
            changes += 1
            
    return changes