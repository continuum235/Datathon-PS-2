# ResiliNet: AI-Driven Financial Contagion Simulation
## Overview
**ResiliNet** is an advanced financial simulation engine designed to visualize, predict, and mitigate **Systemic Risk** in interbank lending networks. 

Moving beyond static graphs, ResiliNet utilizes **Graph Theory**, **Game Theory (Nash Equilibrium)**, and **Machine Learning** to identify "Super Spreaders" of financial distress and calculate the "Sensitivity" (Hidden Bombs) of individual banks before a crash occurs.

The system features a **Central Counterparty (CCP) Clearing Mechanism** that actively intervenes to penalize high-risk trades and halts the market (Circuit Breaker) during periods of high entropy.

---

## Key Features (The USP)

### 1. "Hidden Bomb" Detection (Sensitivity Analysis)
Unlike traditional models that only look at current assets, our **Differential Risk Engine** calculates `d(Risk)/d(Lending)`. It identifies banks that look safe on the surface but possess high structural sensitivity—the "Hidden Bombs" waiting to explode.

### 2. CCP Penalty Wallet & "Super Spreader" Containment
The system uses **Eigenvector Centrality** to identify interconnected "Super Spreader" nodes. If a Super Spreader attempts a high-risk transaction, the CCP:
* **Rejects** the trade.
* **Fines** the bank.
* Collects fines in a visible **Penalty Wallet** to offset systemic losses.

### 3. Nash Equilibrium Stabilization
The simulation implements a game-theoretic approach where banks adjust their strategy (Hoard vs. Invest) based on their neighbors' health. The system visualizes the convergence toward a stable market state.

### 4. Real-Time Circuit Breaker
Implements **Basel III** capital requirements. If the insolvency rate crosses **30%** or system entropy spikes, the **Market Halts** automatically to prevent total value destruction.

### 5. Immersive "CORE-ML" UI
A cinematic, high-performance visualization using `react-force-graph-2d` with:
* Neon-lit contagion paths.
* Real-time PnL (Profit & Loss) tickers per node.
* Dynamic physics engine that expands to fill the screen.

---

## Tech Stack

### **Frontend**
* **React (Vite):** Core framework.
* **Tailwind CSS:** Styling and animations (CRT scanlines, neon glows).
* **React Force Graph:** GPU-accelerated network visualization.
* **Lucide React:** Iconography.

### **Backend**
* **Python (Flask):** REST API server.
* **NetworkX:** Graph topology and centrality algorithms.
* **NumPy:** Mathematical modeling for shock propagation and payoff functions.
* **PyTorch / Geometric:** (Optional integration points for GNNs).

---

## Getting Started

### Prerequisites
* Node.js (v16+)
* Python (3.8+)

### 1. Setup Backend
```bash
cd backend
pip install -r requirements.txt
python server.py
