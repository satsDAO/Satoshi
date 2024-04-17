require('dotenv').config()
require('@nomicfoundation/hardhat-toolbox')
require('hardhat-contract-sizer')

const network = process.env.NETWORK
if (network) {
  const supportedNetworks = [
    'sepolia',
    'optimism',
    'base',
    'polygon',
    'arbitrum',
    'mainnet'
  ]
  if (!supportedNetworks.includes(network)) {
    throw new Error('Unsupported network')
  }
}

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 20_000
      }
    }
  },
  networks: {},
  mocha: {
    timeout: 5 * 60 * 1000
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
    only: ['Satoshi.sol']
  }
}
if (network) {
  const networkConfig = {
    sepolia: {
      url: process.env.SEPOLIA_QUICKNODE_HTTPS_URL,
      blockNumber: 5351948
    },
    arbitrum: {
      url: process.env.ARBITRUM_QUICKNODE_HTTPS_URL,
      blockNumber: 183975267
    },
    optimism: {
      url: process.env.OPTIMISM_QUICKNODE_HTTPS_URL,
      blockNumber: 116577937
    },
    base: {
      url: process.env.BASE_QUICKNODE_HTTPS_URL,
      blockNumber: 10982718
    },
    mainnet: {
      url: process.env.MAINNET_QUICKNODE_HTTPS_URL,
      blockNumber: 19302428
    }
  }
  config.networks.hardhat = {
    forking: {
      enabled: true,
      url: networkConfig[network].url,
      blockNumber: networkConfig[network].blockNumber
    }
  }
}
module.exports = config
