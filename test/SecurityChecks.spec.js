const { expect } = require('chai')
const { ethers } = require('hardhat')
const { parseUnits } = ethers
const {
  loadFixture
} = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const utils = require('./helper/utils')

describe('[SecurityChecks]', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function setupFixture () {
    const [deployer, user, hacker] = await ethers.getSigners()

    // setup token contracts
    const TokenFactory = await ethers.getContractFactory('CustomERC20')
    const tBTC = await TokenFactory.deploy('Custom tBTC', 'tBTC', 18)
    const SatoshiFactory = await ethers.getContractFactory('Satoshi')
    const SATS = await SatoshiFactory.deploy(tBTC.target, 'Satoshi', 'SATS')

    // setup tBTC balances
    await tBTC.mint(deployer.address, parseUnits('1', await tBTC.decimals()))
    await tBTC.mint(user.address, parseUnits('0.5', await tBTC.decimals()))
    await tBTC.mint(hacker.address, parseUnits('1000', await tBTC.decimals()))

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

  describe('[Inflation attack]', () => {
    let tBTC, SATS, user, hacker

    beforeEach(async () => {
      const fixtures = await loadFixture(setupFixture)
      tBTC = fixtures.tBTC
      SATS = fixtures.SATS
      user = fixtures.user
      hacker = fixtures.hacker
      console.log('\n=== spec start ===')
      await utils.printBalances(
        { user, hacker },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
    })

    afterEach(async () => {
      await utils.printBalances(
        { user, hacker },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
      console.log('=== spec end ===')
    })

    // Example 1 from https://mixbytes.io/blog/overview-of-the-inflation-attack
    it('Rounding shares to zero', async () => {
      const tBTCBalanceHacker = await tBTC.balanceOf(hacker.address)
      const tBTCBalanceUser = await tBTC.balanceOf(user.address)

      // The hacker mints for themself 1 SATS
      const amountInHacker = parseUnits('0.00000001', 18)
      await tBTC.connect(hacker).approve(SATS.target, amountInHacker)
      await SATS.connect(hacker).deposit(amountInHacker, hacker.address)
      const satsAmountHacker = await SATS.balanceOf(hacker.address)
      expect(satsAmountHacker).to.be.eq(parseUnits('1', 18))

      // The hacker inflates the denominator
      const inflatedAmount = parseUnits('0.5', 18)
      await tBTC.connect(hacker).transfer(SATS.target, inflatedAmount)

      // user deposits 0.5 tBTC
      const amountInUser = parseUnits('0.5', 18)
      await tBTC.connect(user).approve(SATS.target, amountInUser)
      await SATS.connect(user).deposit(amountInUser, user.address)
      const satsAmountUser = await SATS.balanceOf(user.address)
      // although the denominator is inflated,
      // the user still gets the same shares
      expect(satsAmountUser).to.be.eq(amountInUser * 10n ** 8n)

      // hacker withdraws all shares, but take huge amount of losses
      await SATS.connect(hacker).redeem(
        satsAmountHacker,
        hacker.address,
        hacker.address
      )
      expect(await tBTC.balanceOf(hacker.address)).to.be.lt(tBTCBalanceHacker)

      // user withdraws all shares, but take very small amount of losses
      await SATS.connect(user).redeem(
        satsAmountUser,
        user.address,
        user.address
      )
      expect(await tBTC.balanceOf(user.address)).to.be.lte(tBTCBalanceUser)

      // since the user & hacker withdraws all shares,
      // the totalAssets and totalSupply should be 0,
      // but because the hacker inflated the denominator,
      // so there's still some tBTC left in the contract (hackers' losses)
      expect(await SATS.totalSupply()).to.be.eq(0n)
      expect(await SATS.totalAssets()).to.be.eq(0n)
      expect(await tBTC.balanceOf(SATS.target)).to.be.eq(inflatedAmount)
    })

    // Example 2 from https://mixbytes.io/blog/overview-of-the-inflation-attack
    it('Rounding to one share', async () => {
      const tBTCBalanceHacker = await tBTC.balanceOf(hacker.address)
      const tBTCBalanceUser = await tBTC.balanceOf(user.address)

      // The hacker mints for themself 1 SATS
      const amountInHacker = parseUnits('0.00000001', 18)
      await tBTC.connect(hacker).approve(SATS.target, amountInHacker)
      await SATS.connect(hacker).deposit(amountInHacker, hacker.address)
      const satsAmountHacker = await SATS.balanceOf(hacker.address)
      expect(satsAmountHacker).to.be.eq(parseUnits('1', 18))

      // The hacker inflates the denominator
      const inflatedAmount = parseUnits('0.25', 18)
      await tBTC.connect(hacker).transfer(SATS.target, inflatedAmount)

      // user deposits 0.5 tBTC
      const amountInUser = parseUnits('0.5', 18)
      await tBTC.connect(user).approve(SATS.target, amountInUser)
      await SATS.connect(user).deposit(amountInUser, user.address)
      const satsAmountUser = await SATS.balanceOf(user.address)
      // user still gets the same shares
      expect(satsAmountUser).to.be.eq(amountInUser * 10n ** 8n)

      // hacker withdraws all shares, but take huge amount of losses
      await SATS.connect(hacker).redeem(
        satsAmountHacker,
        hacker.address,
        hacker.address
      )
      expect(await tBTC.balanceOf(hacker.address)).to.be.lt(tBTCBalanceHacker)

      // user withdraws all shares, but no losses
      await SATS.connect(user).redeem(
        satsAmountUser,
        user.address,
        user.address
      )
      expect(await tBTC.balanceOf(user.address)).to.be.eq(tBTCBalanceUser)

      // since the user & hacker withdraws all shares,
      // the totalAssets and totalSupply should be 0,
      // but because the hacker inflated the denominator,
      // so there's still some tBTC left in the contract (hackers' losses)
      expect(await SATS.totalSupply()).to.be.eq(0n)
      expect(await SATS.totalAssets()).to.be.eq(0n)
      expect(await tBTC.balanceOf(SATS.target)).to.be.eq(inflatedAmount)
    })

    it('ZERO_ASSETS check', async () => {
      // The hacker mints for themself 0 SATS
      const amountInHacker = 0n
      await tBTC.connect(hacker).approve(SATS.target, amountInHacker)
      const request = SATS.connect(hacker).deposit(
        amountInHacker,
        hacker.address
      )
      expect(request).to.be.rejectedWith('ZERO_ASSETS')
    })
  })
})
