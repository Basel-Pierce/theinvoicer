// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ITRC721.sol";

interface ITRC721Metadata is ITRC721 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function tokenURI(uint256 tokenId) external view returns (string memory);
}
