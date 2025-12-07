const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const requirementsPath = path.join(rootDir, 'requirements.txt');

if (!fs.existsSync(requirementsPath)) {
  console.error('Arquivo requirements.txt não encontrado na raiz do projeto.');
  process.exit(1);
}

const scopes = {
  root: { packages: [], cwd: rootDir, description: 'dependências da raiz' },
  server: { packages: [], cwd: path.join(rootDir, 'server'), description: 'dependências do servidor' },
  client: { packages: [], cwd: path.join(rootDir, 'client'), description: 'dependências do cliente' },
};

const lines = fs.readFileSync(requirementsPath, 'utf-8').split(/\r?\n/);

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) {
    continue;
  }
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    console.warn(`Linha ignorada no requirements.txt (formato inválido): "${line}"`);
    continue;
  }

  const scopeKey = line.slice(0, separatorIndex).trim();
  const packageSpec = line.slice(separatorIndex + 1).trim();

  if (!packageSpec) {
    console.warn(`Linha ignorada no requirements.txt (sem pacote): "${line}"`);
    continue;
  }

  if (!scopes[scopeKey]) {
    scopes[scopeKey] = {
      packages: [],
      cwd: path.join(rootDir, scopeKey),
      description: `dependências do escopo "${scopeKey}"`,
    };
  }

  scopes[scopeKey].packages.push(packageSpec);
}

for (const [scopeKey, scopeInfo] of Object.entries(scopes)) {
  if (!scopeInfo.packages.length) {
    continue;
  }

  console.log(`\nInstalando ${scopeInfo.description} (${scopeKey}):`);
  console.log(`  npm install ${scopeInfo.packages.join(' ')}`);

  const result = spawnSync('npm', ['install', ...scopeInfo.packages], {
    cwd: scopeInfo.cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`Falha ao instalar dependências do escopo "${scopeKey}".`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nTodas as dependências listadas no requirements.txt foram instaladas com sucesso.');
