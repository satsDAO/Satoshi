const { ethers } = require('hardhat')
const { formatUnits } = ethers

async function deployTestERC20 ({ name, symbol, decimals, deployer }) {
  const testTokenFactory = await ethers.getContractFactory(
    'CustomERC20',
    deployer
  )
  const testToken = await testTokenFactory.deploy(name, symbol, decimals)
  await testToken.waitForDeployment()
  console.log('[contract] CustomERC20:', testToken.target)
  return testToken
}

async function fetchBalances (contract, tokens, opts = {}) {
  const balance = {}
  if (opts.ETH) {
    balance.ETH = await ethers.provider.getBalance(
      contract.address || contract.target
    )
  }
  for (const name in tokens) {
    balance[name] = await fetchBalance(contract, tokens[name])
  }
  return balance
}

async function fetchBalance (contract, token) {
  return token.balanceOf(contract.address || contract.target)
}

async function printBalance (balance, name, tokens) {
  for (const sym in balance) {
    if (sym === 'ETH') {
      console.log(`[${name}] ${sym}:`, formatUnits(balance[sym], 18))
    } else {
      const decimals = await tokens[sym].decimals()
      console.log(`[${name}] ${sym}:`, formatUnits(balance[sym], decimals))
    }
  }
}

async function printBalances (contracts, tokens, opts = {}) {
  console.log(`---${opts.context ? ' ' + opts.context : ''} balances ---`)
  for (const key in contracts) {
    const balance = await fetchBalances(contracts[key], tokens, opts)
    await printBalance(balance, key, tokens)
  }
}

module.exports = {
  deployTestERC20,
  printBalances
}
