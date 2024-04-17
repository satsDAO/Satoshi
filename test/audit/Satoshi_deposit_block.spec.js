const { expect } = require('chai')
const { ethers } = require('hardhat')
const { parseUnits } = ethers
const {
  loadFixture
} = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const utils = require('../helper/utils')

describe('[Satoshi]', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function setupFixture () {
    const [deployer, user, hacker] = await ethers.getSigners()

    // setup token contracts
    const TokenFactory = await ethers.getContractFactory('CustomERC20')
    const tBTC = await TokenFactory.deploy('Custom tBTC', 'tBTC', 18)

    // Satoshi.sol
    const SatoshiFactory = await ethers.getContractFactory('Satoshi')
    const SATS = await SatoshiFactory.deploy(tBTC.target, 'Satoshi', 'SATS')

    // setup tBTC balances
    await tBTC.mint(deployer.address, parseUnits('1', await tBTC.decimals()))
    await tBTC.mint(user.address, parseUnits('0.5', await tBTC.decimals()))
    await tBTC.mint(hacker.address, parseUnits('0.5', await tBTC.decimals()))

    console.log({
      name: await tBTC.name(),
      symbol: await tBTC.symbol(),
      decimals: await tBTC.decimals()
    })
    console.log({
      name: await SATS.name(),
      symbol: await SATS.symbol(),
      decimals: await SATS.decimals()
    })
    return { tBTC, SATS, deployer, user, hacker }
  }

  describe('[deposit]', () => {
    let tBTC, SATS, deployer, user, hacker

    before(async () => {
      const fixtures = await loadFixture(setupFixture)
      tBTC = fixtures.tBTC
      SATS = fixtures.SATS
      deployer = fixtures.deployer
      user = fixtures.user
      hacker = fixtures.hacker
    })

    beforeEach(async () => {
      console.log('\n=== spec start ===')
      await utils.printBalances(
        { deployer, user, hacker },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
    })

    afterEach(async () => {
      await utils.printBalances(
        { deployer, user, hacker },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
      console.log('=== spec end ===')
    })

    it('block first deposit', async () => {
      const tBTCBalanceH = await tBTC.balanceOf(hacker.address)
      await tBTC.connect(hacker).approve(SATS.target, tBTCBalanceH)
      const tBTCBalanceU = await tBTC.balanceOf(user.address)
      await tBTC.connect(user).approve(SATS.target, tBTCBalanceU)

      // less than 1e8
      const satsAmount1 = '99999999'
      const assets = await SATS.previewMint(satsAmount1)
      console.log({ assets })
      await SATS.connect(hacker).mint(satsAmount1, hacker.address)

      const satsAmount2 = '100000000000000000'
      await SATS.connect(user).deposit(satsAmount2, user.address) // will be revert
    })
  })
})
