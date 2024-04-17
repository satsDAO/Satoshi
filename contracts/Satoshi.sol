// SPDX-License-Identifier: MIT
// Copyright (c) 2024 info@sats.do
/*
  Make SATS the Currency for billions
  1 SATS backed by 1 Satoshi, SATS is fractionalised tBTC.
  1tBTC = 100M SATS like how Satoshi was intended.

  This contract is free, immutable and permissionless.

  Fun Fact:
  ===

  Satoshi Nakamoto is most likely into buddism.
  Sat is Sanskirt word in buddism means "Truth", also a buddist numeric value of 0.00000001 (10^-8)
  In ancient texts, fusion words based on Sat refer to "Universal Spirit, Universal Principle, Being, Soul of the World, Brahman"

  1BTC = 100_000_000
  // Buddism numeric system for small numbers
  0.00000001 SAT 沙
  0.00000000_1 塵
  0.00000000_01 埃
  0.00000000_001 MINI-SAT 渺
  0.00000000_0001 漠
  0.00000000_00001 模糊
  0.00000000_00000_1 逡巡
  0.00000000_00000_01 須臾
  0.00000000_00000_001 瞬息
  0.00000000_00000_0001 彈指
  0.00000000_00000_00001 殺那 Shortest moment of time.

  tBTC Native contract deploy across chains
  ===
  Ethereum 0x18084fba666a33d37592fa2633fd49a74dd93a88
  Arbitrum 0x6c84a8f1c29108f47a79964b5fe888d4f4d0de40
  Optimism 0x6c84a8f1c29108f47a79964b5fe888d4f4d0de40
  Polygon 0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b
  Base 0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b
  Sepolia 0x517f2982701695D4E52f1ECFBEf3ba31Df470161
  Solana 6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU
*/
pragma solidity ^0.8.24;

import { ERC20, ERC4626, FixedPointMathLib, SafeTransferLib } from 'solmate/src/mixins/ERC4626.sol';
import { ReentrancyGuard } from 'solmate/src/utils/ReentrancyGuard.sol';

/// @title Satoshi Vault Contract
/// @notice Implements a vault for tBTC token where 1 tBTC equals 1e8 SATS (Satoshis).
/// This contract allows depositing and withdrawing tBTC in a way that represents these transactions in SATS, managing the conversion and keeping track of the net flow of tBTC within the contract.
contract Satoshi is ReentrancyGuard, ERC4626 {
  using FixedPointMathLib for uint256;
  using SafeTransferLib for ERC20;

  error InvalidAddress();

  /// @notice The net flow of tBTC tokens within the contract.
  uint256 public netFlow;

  uint256 public constant SAT = 1e8;
  uint256 public constant WAD = 1e18;

  modifier validAddress(address _address) {
    _validAddress(_address);
    _;
  }

  /// @dev Initializes the Satoshi vault contract with tBTC as the underlying asset.
  /// @param _tBTC The ERC20 token address of tBTC to be used as the underlying asset.
  /// @param _name The name of the vault token.
  /// @param _symbol The symbol of the vault token.
  constructor(
    ERC20 _tBTC,
    string memory _name,
    string memory _symbol
  ) ERC4626(_tBTC, _name, _symbol) {}

  /// @notice Calculates the total assets under management in tBTC.
  /// @return The total amount of tBTC managed by the vault.
  function totalAssets() public view override returns (uint256) {
    return netFlow;
  }

  /// @notice Deposits tBTC into the vault in exchange for vault shares.
  /// @dev Overrides the deposit function of ERC4626 to include reentrancy protection.
  /// @param assets The amount of tBTC to deposit.
  /// @param receiver The address to receive the vault shares.
  /// @return shares The amount of vault shares issued for the deposit.
  function deposit(
    uint256 assets,
    address receiver
  )
    public
    override
    nonReentrant
    validAddress(receiver)
    returns (uint256 shares)
  {
    return super.deposit(assets, receiver);
  }

  /// @notice Mints vault shares in exchange for tBTC.
  /// @dev Overrides the mint function of ERC4626 to include reentrancy protection.
  /// @param shares The amount of shares to mint.
  /// @param receiver The address to receive the minted shares.
  /// @return assets The amount of tBTC used to mint the shares.
  function mint(
    uint256 shares,
    address receiver
  )
    public
    override
    nonReentrant
    validAddress(receiver)
    returns (uint256 assets)
  {
    shares = (shares / SAT) * SAT; // Round down to the nearest 1e8 SATS.
    return super.mint(shares, receiver);
  }

  /// @notice Withdraws tBTC from the vault in exchange for vault shares.
  /// @dev Overrides the withdraw function of ERC4626 to include reentrancy protection.
  /// @param assets The amount of tBTC to withdraw.
  /// @param receiver The address to receive the tBTC.
  /// @param owner The address owning the shares being withdrawn.
  /// @return shares The amount of vault shares burned for the withdrawal.
  function withdraw(
    uint256 assets,
    address receiver,
    address owner
  )
    public
    override
    nonReentrant
    validAddress(receiver)
    returns (uint256 shares)
  {
    return super.withdraw(assets, receiver, owner);
  }

  /// @notice Redeems vault shares in exchange for tBTC.
  /// @dev Overrides the redeem function of ERC4626 to include reentrancy protection.
  /// @param shares The amount of shares to redeem.
  /// @param receiver The address to receive the tBTC.
  /// @param owner The address owning the shares being redeemed.
  /// @return assets The amount of tBTC given in exchange for the shares.
  function redeem(
    uint256 shares,
    address receiver,
    address owner
  )
    public
    override
    nonReentrant
    validAddress(receiver)
    returns (uint256 assets)
  {
    shares = (shares / SAT) * SAT; // Round down to the nearest 1e8 SATS.
    return super.redeem(shares, receiver, owner);
  }

  /// @notice Converts a specific amount of tBTC to its equivalent amount in vault shares.
  /// @dev Provides an optimized gas calculation for share conversion.
  /// @param assets The amount of tBTC to be converted.
  /// @return The equivalent amount of shares.
  function convertToShares(
    uint256 assets
  ) public view override returns (uint256) {
    uint256 supply = totalSupply; // Optimization to save gas.
    return
      supply == 0 ? assets * SAT : assets.mulDivDown(supply, totalAssets());
  }

  /// @notice Converts a specific amount of shares to its equivalent amount in tBTC.
  /// @dev Provides an optimized gas calculation for asset conversion.
  /// @param shares The amount of shares to be converted.
  /// @return The equivalent amount of tBTC.
  function convertToAssets(
    uint256 shares
  ) public view override returns (uint256) {
    shares = (shares / SAT) * SAT; // Round down to the nearest 1e8 SATS.
    uint256 supply = totalSupply; // Optimization to save gas.
    return
      supply == 0 ? shares / SAT : shares.mulDivDown(totalAssets(), supply);
  }

  /// @notice Calculates the amount of tBTC that would be obtained by minting a specific amount of shares.
  /// @dev Provides an optimized gas calculation for mint preview.
  /// @param shares The amount of shares to be minted.
  /// @return The equivalent amount of tBTC that would be obtained.
  function previewMint(uint256 shares) public view override returns (uint256) {
    shares = (shares / SAT) * SAT; // Round down to the nearest 1e8 SATS.
    uint256 supply = totalSupply; // Optimization to save gas.
    return supply == 0 ? shares / SAT : shares.mulDivUp(totalAssets(), supply);
  }

  /// @notice Calculates the amount of shares that would be needed to withdraw a specific amount of tBTC.
  /// @dev Provides an optimized gas calculation for withdraw preview.
  /// @param assets The amount of tBTC to be withdrawn.
  /// @return The equivalent amount of shares needed.
  function previewWithdraw(
    uint256 assets
  ) public view override returns (uint256) {
    uint256 supply = totalSupply; // Optimization to save gas.
    return supply == 0 ? assets * SAT : assets.mulDivUp(supply, totalAssets());
  }

  /// @dev Adjusts the netFlow variable upon withdrawal.
  /// @param assets The amount of tBTC being withdrawn.
  function beforeWithdraw(uint256 assets, uint256) internal override {
    netFlow -= assets;
  }

  /// @dev Adjusts the netFlow variable upon deposit.
  /// @param assets The amount of tBTC being deposited.
  function afterDeposit(uint256 assets, uint256) internal override {
    netFlow += assets;
  }

  /// @notice Returns the current price per share in terms of tBTC.
  /// @return The price of one vault share in tBTC.
  function pricePerShare() public view returns (uint256) {
    return convertToAssets(WAD);
  }

  function _validAddress(address _address) internal pure {
    if (_address == address(0)) revert InvalidAddress();
  }
}
