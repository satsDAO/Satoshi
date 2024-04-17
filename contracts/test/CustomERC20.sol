// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { ERC20 } from 'solmate/src/tokens/ERC20.sol';

contract CustomERC20 is ERC20 {
  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) ERC20(_name, _symbol, _decimals) {}

  function mint(address _to, uint256 _amount) external {
    _mint(_to, _amount);
  }
}
