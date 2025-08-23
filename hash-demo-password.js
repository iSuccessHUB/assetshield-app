// Generate hash for demo password
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + '_' + password.length;
}

const password = 'demo123';
const hash = hashPassword(password);
console.log('Password:', password);
console.log('Hash:', hash);