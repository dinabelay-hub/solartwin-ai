# SolarTwin AI: Trust-Aware Solar Energy Digital Twin ☀️🔋

**SolarTwin AI** is a premium, high-fidelity engineering prototype designed to explore a critical challenge in renewable energy management: **What should an energy management system do when a solar forecast becomes unreliable?**

This application combines a real-time deterministic energy simulation, an agentic decision pipeline, and a 3D interactive digital twin to visualize energy flows and forecast trust monitoring.

---

## 🚀 Key Features

### 📡 1. Agentic Decision Pipeline
The system uses a modular "agentic" architecture to process energy data:
- **Forecast Agent:** Generates deterministic solar production estimates.
- **Trust Monitor Agent:** Analyzes deviation between forecast and actual ground truth to assign a reliability status (NORMAL, CAUTION, HIGH RISK).
- **Decision Agent:** Selects between a **Standard Policy** (efficiency-focused) and a **Trust-Aware Policy** (safety-focused) based on monitor signals.
- **Audit Agent:** Generates a plain-language trace of every operational decision.

### 🎮 2. Interactive 3D Digital Twin
Built with **React Three Fiber (Three.js)**, the scene provides:
- Live visualization of solar panels, BESS (Battery Energy Storage System), and grid pylons.
- Dynamic energy flow lines that change speed and color based on real-time kW values.
- Real-time Battery State of Charge (SoC) visualization.

### ⛈️ 3. Operational Stress Scenarios
Test the system's resilience with four built-in scenarios:
- **Normal Operation:** Clear skies and stable demand.
- **Sudden Cloud Cover:** Simulated 80% drop in solar intensity.
- **Capacity Mismatch:** Synthetic representation of domain shift where the model overestimates capacity.
- **Demand Spike:** Unexpected facility load increase during peak hours.

---

## 🛠️ Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript (Strict)
- **3D Engine:** Three.js / @react-three/fiber
- **Styling:** Tailwind CSS v4 (PostCSS)
- **Charts:** Recharts
- **Icons:** Lucide-React
- **Physics:** Custom deterministic energy-balance engine

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or higher)
- npm or yarn

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/solartwin-ai.git
   cd solartwin-ai
