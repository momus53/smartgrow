const fetch = global.fetch || require('node-fetch');

async function run() {
  try {
    const registerBody = { username: 'nodecurl1', email: 'nodecurl1@example.com', password: 'P@ssw0rd!', nombre_completo: 'Node Tester' };
    let r = await fetch('http://localhost:3000/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registerBody)
    });
    const regText = await r.text();
    console.log('REGISTER status:', r.status);
    console.log('REGISTER body:', regText);

    const loginBody = { username: 'nodecurl1', password: 'P@ssw0rd!' };
    r = await fetch('http://localhost:3000/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginBody)
    });
    const loginText = await r.text();
    console.log('LOGIN status:', r.status);
    console.log('LOGIN body:', loginText);
  } catch (err) {
    console.error('ERROR running tests:', err);
  }
}

run();
