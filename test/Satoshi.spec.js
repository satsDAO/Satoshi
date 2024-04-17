const { expect } = require('chai')
const { ethers } = require('hardhat')
const { parseUnits } = ethers
const {
  loadFixture
} = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const utils = require('./helper/utils')

describe('[Satoshi]', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function setupFixture () {
    const [deployer, user] = await ethers.getSigners()

    // setup token contracts
    const TokenFactory = await ethers.getContractFactory('CustomERC20')
    const tBTC = await TokenFactory.deploy('Custom tBTC', 'tBTC', 18)

    // Satoshi.sol
    const SatoshiFactory = await ethers.getContractFactory('Satoshi')
    const SATS = await SatoshiFactory.deploy(tBTC.target, 'Satoshi', 'SATS')

    // setup tBTC balances
    await tBTC.mint(deployer.address, parseUnits('1', await tBTC.decimals()))
    await tBTC.mint(user.address, parseUnits('0.5', await tBTC.decimals()))

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
    return { tBTC, SATS, deployer, user }
  }

  describe('[initial states]', () => {
    let tBTC, SATS

    beforeEach(async () => {
      const fixtures = await loadFixture(setupFixture)
      tBTC = fixtures.tBTC
      SATS = fixtures.SATS
    })

    it('should have correct name and symbol', async () => {
      const name = await SATS.name()
      const symbol = await SATS.symbol()
      const decimals = await SATS.decimals()
      expect(name).to.be.eq('Satoshi')
      expect(symbol).to.be.eq('SATS')
      expect(decimals).to.be.eq(18)
    })

    it('should have correct tBTC address', async () => {
      const tBTCAddress = await SATS.asset()
      expect(tBTCAddress).to.be.eq(tBTC.target)
    })

    it('initial supply should be 0', async () => {
      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(0)
    })

    it('initial totalAssets should be 0', async () => {
      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(0)
    })

    it('inital previewDeposit', async () => {
      const tBTCAmount = parseUnits('1', 18)
      const satsAmount = await SATS.previewDeposit(tBTCAmount)
      expect(satsAmount).to.be.eq(tBTCAmount * 10n ** 8n)
    })

    it('inital previewMint', async () => {
      const satsAmount = parseUnits('1', 8 + 18)
      const tBTCAmount = await SATS.previewMint(satsAmount)
      expect(tBTCAmount).to.be.eq(satsAmount / 10n ** 8n)
    })

    it('inital previewWithdraw', async () => {
      const tBTCAmount = parseUnits('1', 18)
      const satsAmount = await SATS.previewWithdraw(tBTCAmount)
      expect(satsAmount).to.be.eq(tBTCAmount * 10n ** 8n)
    })

    it('initial previewRedeem', async () => {
      const satsAmount = parseUnits('1', 8 + 18)
      const tBTCAmount = await SATS.previewRedeem(satsAmount)
      expect(tBTCAmount).to.be.eq(satsAmount / 10n ** 8n)
    })

    it('initial pricePerShare', async () => {
      const pricePerShare = await SATS.pricePerShare()
      expect(pricePerShare).to.be.eq(parseUnits('0.00000001', 18))
    })
  })

  describe('[deposit & withdraw]', () => {
    let tBTC, SATS, deployer, user

    before(async () => {
      const fixtures = await loadFixture(setupFixture)
      tBTC = fixtures.tBTC
      SATS = fixtures.SATS
      deployer = fixtures.deployer
      user = fixtures.user
    })

    beforeEach(async () => {
      console.log('\n=== spec start ===')
      await utils.printBalances(
        { deployer, user },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
    })

    afterEach(async () => {
      await utils.printBalances(
        { deployer, user },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
      console.log('=== spec end ===')
    })

    it('[deposit] deployer deposits 1 tBTC', async () => {
      const amountIn = parseUnits('1', 18)
      const satsAmount = await SATS.previewDeposit(amountIn)
      await tBTC.connect(deployer).approve(SATS.target, amountIn)
      await SATS.connect(deployer).deposit(amountIn, deployer.address)

      const satsBalance = await SATS.balanceOf(deployer.address)
      expect(satsBalance).to.be.eq(satsAmount)

      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(amountIn)

      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(satsAmount)
    })

    it('[deposit] user deposits 0.5 tBTC', async () => {
      const amountIn = parseUnits('0.5', 18)
      const satsAmount = await SATS.previewDeposit(amountIn)
      await tBTC.connect(user).approve(SATS.target, amountIn)
      await SATS.connect(user).deposit(amountIn, user.address)

      const satsBalance = await SATS.balanceOf(user.address)
      expect(satsBalance).to.be.eq(satsAmount)
    })

    it('check totalSupply', async () => {
      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(parseUnits('1.5', 18) * 10n ** 8n)
    })

    it('check totalAssets', async () => {
      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(parseUnits('1.5', 18))
    })

    it('check previewDeposit', async () => {
      const tBTCAmount = parseUnits('1', 18)
      const satsAmount = await SATS.previewDeposit(tBTCAmount)
      expect(satsAmount).to.be.eq(tBTCAmount * 10n ** 8n)
    })

    it('check previewMint', async () => {
      const satsAmount = parseUnits('1', 8 + 18)
      const tBTCAmount = await SATS.previewMint(satsAmount)
      expect(tBTCAmount).to.be.eq(satsAmount / 10n ** 8n)
    })

    it('check previewWithdraw', async () => {
      const tBTCAmount = parseUnits('1', 18)
      const satsAmount = await SATS.previewWithdraw(tBTCAmount)
      expect(satsAmount).to.be.eq(tBTCAmount * 10n ** 8n)
    })

    it('check previewRedeem', async () => {
      const satsAmount = parseUnits('1', 8 + 18)
      const tBTCAmount = await SATS.previewRedeem(satsAmount)
      expect(tBTCAmount).to.be.eq(satsAmount / 10n ** 8n)
    })

    it('check pricePerShare', async () => {
      const pricePerShare = await SATS.pricePerShare()
      expect(pricePerShare).to.be.eq(parseUnits('0.00000001', 18))
    })

    it('[withdraw] deployer withdraws 1 tBTC', async () => {
      const amountOut = parseUnits('1', 18)
      await SATS.connect(deployer).withdraw(
        amountOut,
        deployer.address,
        deployer.address
      )

      const satsBalance = await SATS.balanceOf(deployer.address)
      expect(satsBalance).to.be.eq(0n)

      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(parseUnits('0.5', 18))

      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(parseUnits('0.5', 18) * 10n ** 8n)
    })

    it('[withdraw] user withdraws 0.5 tBTC', async () => {
      const amountOut = parseUnits('0.5', 18)
      await SATS.connect(user).withdraw(amountOut, user.address, user.address)

      const satsBalance = await SATS.balanceOf(user.address)
      expect(satsBalance).to.be.eq(0n)

      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(0n)

      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(0n)
    })
  })

  describe('[mint & redeem]', () => {
    let tBTC, SATS, deployer, user

    before(async () => {
      const fixtures = await loadFixture(setupFixture)
      tBTC = fixtures.tBTC
      SATS = fixtures.SATS
      deployer = fixtures.deployer
      user = fixtures.user
    })

    beforeEach(async () => {
      console.log('\n=== spec start ===')
      await utils.printBalances(
        { deployer, user },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
    })

    afterEach(async () => {
      await utils.printBalances(
        { deployer, user },
        { tBTC, SATS },
        { context: 'wallet' }
      )
      await utils.printBalances({ SATS }, { tBTC }, { context: 'contract' })
      console.log('=== spec end ===')
    })

    it('[mint] deployer max mint SATS', async () => {
      const tBTCBalance = await tBTC.balanceOf(deployer.address)
      const satsAmount = await SATS.previewDeposit(tBTCBalance)
      await tBTC.connect(deployer).approve(SATS.target, tBTCBalance)
      await SATS.connect(deployer).mint(satsAmount, deployer.address)

      const satsBalance = await SATS.balanceOf(deployer.address)
      expect(satsBalance).to.be.eq(satsAmount)

      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(tBTCBalance)

      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(satsAmount)
    })

    it('[mint] user max mint SATS', async () => {
      const tBTCBalance = await tBTC.balanceOf(user.address)
      const satsAmount = await SATS.previewDeposit(tBTCBalance)
      await tBTC.connect(user).approve(SATS.target, tBTCBalance)
      await SATS.connect(user).mint(satsAmount, user.address)

      const satsBalance = await SATS.balanceOf(user.address)
      expect(satsBalance).to.be.eq(satsAmount)

      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(parseUnits('1.5', 18))

      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(parseUnits('1.5', 18) * 10n ** 8n)
    })

    it('[redeem] deployer redeems all SATS', async () => {
      const satsAmount = await SATS.balanceOf(deployer.address)
      await SATS.connect(deployer).redeem(
        satsAmount,
        deployer.address,
        deployer.address
      )

      const satsBalance = await SATS.balanceOf(deployer.address)
      expect(satsBalance).to.be.eq(0n)

      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(parseUnits('0.5', 18))

      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(parseUnits('0.5', 18) * 10n ** 8n)
    })

    it('[redeem] user redeems all SATS', async () => {
      const satsAmount = await SATS.balanceOf(user.address)
      await SATS.connect(user).redeem(satsAmount, user.address, user.address)

      const satsBalance = await SATS.balanceOf(user.address)
      expect(satsBalance).to.be.eq(0n)

      const totalAssets = await SATS.totalAssets()
      expect(totalAssets).to.be.eq(0n)

      const totalSupply = await SATS.totalSupply()
      expect(totalSupply).to.be.eq(0n)
    })
  })
})
