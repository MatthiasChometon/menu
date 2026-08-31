import { startPairingBridge } from '../domain/pairing/bridge';

export default defineContentScript({
  matches: ['https://menu.mtxlab.xyz/*'],
  runAt: 'document_idle',
  main(): void {
    startPairingBridge();
  },
});
