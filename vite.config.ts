import { defineConfig, type Plugin } from 'vite';
import dns from 'node:dns';
import decisionEngineHandler from './api/decision-engine';
import visitorQualityHandler from './api/places/visitor-quality';
import simulateInsightHandler from './api/pressure/simulate-insight';

// Force Node.js to prefer IPv4. Prevents 'socket disconnected' / 'wsasend' errors on networks with unstable IPv6 routes to Google APIs
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

function apiPlugin(): Plugin {
  return {
    name: 'tourisma-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/decision-engine', (req, res) => {
        decisionEngineHandler(req, res);
      });

      server.middlewares.use('/api/places/visitor-quality', (req, res) => {
        visitorQualityHandler(req, res);
      });

      server.middlewares.use('/api/pressure/simulate-insight', (req, res) => {
        simulateInsightHandler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [apiPlugin()],
});
