import InteractionEngine from './services/InteractionEngine.js';

async function test() {
  const engine = new InteractionEngine();
  await engine.init('./data/indian_pharma_interactions.json');
  const res = await engine.analyze('ibuprofen', { conditions: [], activeMeds: ['aspirin'] });
  console.log("TEST RESULT:", res);
}
test();
