require('@nomicfoundation/hardhat-toolbox')

const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
  envLines.forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  })
}

const {
  RPC_URL,
  SEPOLIA_RPC_URL,
  SEPOLIA_PRIVATE_KEY,
} = process.env

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.21',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: path.join(__dirname, 'contracts'),
    tests: path.join(__dirname, 'test'),
    cache: path.join(__dirname, 'cache'),
    artifacts: path.join(__dirname, 'artifacts'),
  },
  networks: {
    hardhat: {},
    localhost: {
      url: RPC_URL || 'http://127.0.0.1:8545',
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || '',
      accounts: SEPOLIA_PRIVATE_KEY ? [SEPOLIA_PRIVATE_KEY] : [],
    },
  },
}
