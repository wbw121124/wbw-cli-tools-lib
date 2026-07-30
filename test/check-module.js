const m = require('readline-promise');
console.log('keys:', Object.keys(m));
console.log('has default:', 'default' in m);
if (m.default) {
  console.log('default keys:', Object.keys(m.default));
  console.log('has createInterface:', typeof m.default.createInterface);
}
