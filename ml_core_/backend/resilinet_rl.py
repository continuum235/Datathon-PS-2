import numpy as np
import random
import pickle
import os

class BankAgent:
    def __init__(self, bank_id, learning_rate=0.1, discount_factor=0.9, epsilon=0.2):
        self.id = bank_id
        self.lr = learning_rate # How fast I learn
        self.gamma = discount_factor # How much I care about future
        self.epsilon = epsilon # Exploration rate (Try random things?)
        
        # Q-Table: Stores the "Score" of an Action in a given State
        # Rows: States [Safe, Warning, Critical]
        # Cols: Actions [Hoard, Lend, Bailout]
        self.q_table = np.zeros((3, 3)) 
        
        # Mapping for readability
        self.states = {'Safe': 0, 'Warning': 1, 'Critical': 2}
        self.actions = ['HOARD', 'LEND', 'BAILOUT']

    def get_state(self, G):
        """Analyze my neighbors to determine my state."""
        my_health = G.nodes[self.id].get('capital_ratio', 10)
        
        # Check Neighbors
        neighbors = list(G.successors(self.id))
        if not neighbors: return 0 # Safe (No exposure)
        
        risky_neighbors = 0
        for n in neighbors:
            if G.nodes[n].get('status') == 'Defaulted':
                return 2 # Critical (Direct Contagion)
            if G.nodes[n].get('capital_ratio', 10) < 4.0:
                risky_neighbors += 1
                
        if risky_neighbors > 0 or my_health < 5.0:
            return 1 # Warning
            
        return 0 # Safe

    def choose_action(self, state_idx):
        """Decide what to do based on current policy."""
        # Exploration: Try something random to see if it works
        if random.uniform(0, 1) < self.epsilon:
            return random.randint(0, 2)
        
        # Exploitation: Do the best known thing
        return np.argmax(self.q_table[state_idx])

    def learn(self, state, action, reward, next_state):
        """Update the Q-Table based on the result."""
        predict = self.q_table[state, action]
        target = reward + self.gamma * np.max(self.q_table[next_state])
        self.q_table[state, action] += self.lr * (target - predict)

# --- GLOBAL AGENT MANAGER ---
agents = {}

def get_agent(bank_id):
    if bank_id not in agents:
        agents[bank_id] = BankAgent(bank_id)
    return agents[bank_id]

def save_brains():
    """Save learned strategies to disk."""
    with open('bank_brains.pkl', 'wb') as f:
        pickle.dump(agents, f)

def load_brains():
    """Load learned strategies."""
    global agents
    if os.path.exists('bank_brains.pkl'):
        with open('bank_brains.pkl', 'rb') as f:
            agents = pickle.load(f)