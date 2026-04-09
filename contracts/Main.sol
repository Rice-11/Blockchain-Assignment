// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Main {
    uint256 private storedValue;

    event ValueChanged(uint256 newValue);

    constructor() {
        storedValue = 0;
    }

    function setValue(uint256 newValue) external {
        storedValue = newValue;
        emit ValueChanged(newValue);
    }

    function getValue() external view returns (uint256) {
        return storedValue;
    }
}
