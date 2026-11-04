import assert from 'node:assert/strict';
import { DEFAULT_WISHLIST as D } from '../../src/data/initialWishlist.js';
import { migrateDefaults } from '../../src/utils/migrate.js';
import { inferGift } from '../../src/utils/inferGift.js';
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('  ok  ', name); } catch (e) { console.log('  FAIL', name, e.message); process.exitCode = 1; } };

t('old 20-item list (saved at v11) gains exactly the 8 newer starter items', () => {
  const old = D.slice(0, 20);
  const out = migrateDefaults(old, 11);
  assert.equal(out.length, 28);
});
t('a starter item deleted before v11 stays deleted; custom gifts are kept', () => {
  const old = [...D.slice(0, 20).filter(i => i.id !== 'g_fpv_drone'), { id: 'g_123', title: 'Mine', price: 5 }];
  const out = migrateDefaults(old, 11);
  assert.ok(!out.some(i => i.id === 'g_fpv_drone')); assert.ok(out.some(i => i.id === 'g_123')); assert.equal(out.length, 28);
});
t('already-current list is unchanged in size', () => assert.equal(migrateDefaults(D, 13).length, 28));
t('inferGift: cologne is fragrance, $110 is a friend-tier gift', () => {
  const g = inferGift('Jean Paul Gaultier Le Male Eau de Toilette', 110);
  assert.ok(g.tags.includes('fragrance') && g.tags.includes('luxury')); assert.equal(g.closenessRequired, 'friend');
});
t('inferGift: hair gel is hair, cheap gifts are casual', () => { const g = inferGift('Curl Gel for scrunches', 20); assert.deepEqual(g.tags, ['hair']); assert.equal(g.closenessRequired, 'casual'); });
t('inferGift: drone is tech+outdoors in the tech category, unknown things are practical', () => {
  assert.equal(inferGift('FPV Drone kit', 160).category, 'Tech & Gadgets'); assert.equal(inferGift('FPV Drone kit', 160).closenessRequired, 'close');
  assert.deepEqual(inferGift('Mystery thing', 10).tags, ['practical']);
});
console.log(`${n} passed`);
