import { EventEmitter } from '../dist/esm/index.js';

const em = new EventEmitter();
const replayData = [];
em.on('e', (d) => { console.log('handler called with:', d); replayData.push(d); });
console.log('listeners count:', em.listenerCount('e'));
console.log('eventNames:', em.eventNames());

em.emit('e', 'a');
em.emit('e', 'b');
em.emit('e', 'c');

console.log('history:', em.getHistory());
console.log('history count:', em.getHistory().length);

console.log('--- replaying ---');
em.replayHistory({ count: 2 });
console.log('replayData:', replayData);
