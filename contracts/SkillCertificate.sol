// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SkillCertificate is ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;

    event CertificateMinted(address indexed learner, uint256 tokenId, string tokenURI);

    constructor(address initialOwner) 
        ERC721("SkillSwap Certificate", "SKLSWP") 
        Ownable(initialOwner) 
    {}

    /**
     * @dev Mints a new skill certificate NFT.
     * @param learner The address of the learner who earned the certificate.
     * @param _tokenURI The metadata URI containing certificate details.
     */
    function mintCertificate(address learner, string memory _tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(learner, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit CertificateMinted(learner, tokenId, _tokenURI);

        return tokenId;
    }

    // Required overrides by Solidity
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns the total number of certificates minted.
     */
    function totalCertificates() public view returns (uint256) {
        return _nextTokenId;
    }
}
