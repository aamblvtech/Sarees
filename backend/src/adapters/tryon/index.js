import { MockTryOnAdapter } from './mockAdapter.js';
import { ReplicateHostedTryOnAdapter } from './replicateAdapter.js';
import { GenlookTryOnAdapter } from './genlookAdapter.js';

let currentAdapter = null;

export function setTryOnAdapter(adapter) {
  currentAdapter = adapter;
}

export function getTryOnAdapter() {
  const providerType = (process.env.TRYON_PROVIDER || 'genlook').toLowerCase();

  if (currentAdapter && currentAdapter.name === providerType) {
    return currentAdapter;
  }

  switch (providerType) {
    case 'genlook':
      console.log('[TryOn Adapter] Active provider: GenlookTryOnAdapter (Official Genlook Try-On API)');
      currentAdapter = new GenlookTryOnAdapter();
      break;

    case 'replicate':
    case 'idm_vton':
      console.log('[TryOn Adapter] Active provider: ReplicateHostedTryOnAdapter (Hosted IDM-VTON on GPU)');
      currentAdapter = new ReplicateHostedTryOnAdapter();
      break;

    case 'mock':
    case 'simulation':
      console.log('[TryOn Adapter] Active provider: MockTryOnAdapter (Explicit Simulation Mode)');
      currentAdapter = new MockTryOnAdapter();
      break;

    default:
      console.log(`[TryOn Adapter] Unknown provider '${providerType}'. Defaulting to GenlookTryOnAdapter.`);
      currentAdapter = new GenlookTryOnAdapter();
      break;
  }

  return currentAdapter;
}

export async function getActiveProviderInfo() {
  const adapter = getTryOnAdapter();
  if (typeof adapter.getProviderInfo === 'function') {
    const info = adapter.getProviderInfo();
    // If adapter has async credit balance check
    if (typeof adapter.getCreditBalance === 'function' && info.available) {
      const credits = await adapter.getCreditBalance();
      if (credits !== null && credits !== undefined) {
        info.creditBalance = credits;
      }
    }
    return info;
  }
  return {
    provider: adapter.name,
    available: true,
    executionMode: 'mock_simulation'
  };
}
