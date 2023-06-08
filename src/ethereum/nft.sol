// SPDX-License-Identifier: MIT

pragma solidity =0.8.18; // @audit low -unlocked version of solidity - use a locked version to ensure contract is not broken by future compiler updates

  import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
  import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721Enumerable, Ownable {
  using Strings for uint256;  // @audit info - unused library import - remove to save gas on deployment 

  // Pinata route for NFT Storage
  string baseURI;
  // Metadata for NFT Storage
  string public baseExtension = ".json"; // @audit gas - use bytes32 rather than strings for short strings, as it is cheaper to store and compare
  // Fee for NFT Mint
  uint256 public cost = 0.001 ether;
  // Pause NFT Minting
  bool public paused = false; // @audit gas - dont initialize state variables to default values, as this is done automatically by the compiler
  // Reveal NFTs
  bool public revealed = false;
  // Pinata route for unreaveled NFT Storage
  string public notRevealedUri;

  // @audit low - protocol missing events
  constructor(
  ) ERC721("EasyOnRampNFT", "EASYNFT") {
    setBaseURI("");
    setNotRevealedURI("");
  }

  modifier validateEthPayment(uint256 count) {
		require(
			cost * count <= msg.value,
			'SHUBBZ: Insufficient Ether Balance'
		);
		_;
	}

  // View Base URI
  function _baseURI() internal view virtual override returns (string memory) {
    return baseURI;
  }
  
  
  //Whitelist
  // function setWhitelist(address[] calldata addresses, uint8 maxMint) external onlyOwner {
  //   for (uint256 i = 0; i < addresses.length; i++) {
  //       _whitelist[addresses[i]] = maxMint;
  //   }
  // }

  // Mint NFT
  function mint(uint256 _mintAmount) external payable validateEthPayment(_mintAmount) {
    uint256 supply = totalSupply();
    // Require Pause = False
    require(!paused, "SHUBBZ: Minting is currently paused!"); // @audit gas - use revert with custom error codes, rather than require - saves 19149 gas * average gas price currently 21 gwei = 402129 gwei per occurence
    // Require Mint > 1 NFT
    require(_mintAmount > 0);
    // Owner can mint no fee, else must pay cost*amount
    require(msg.value >= cost * _mintAmount);
    //Mint x amount of NFTs for User
    for (uint256 i = 1; i <= _mintAmount; i++) {
      supply++;
      _safeMint(msg.sender, supply);
    }
  }

  //Air Drop NFT to recipient address
  function air_drop(address[] calldata _recipient) external onlyOwner {
        uint256 tokenId = totalSupply(); // @audit gas - cache array length outside of loop to save gas rather than calling it each iteration
        for (uint256 i = 0; i < _recipient.length; i++){ // @audit informational - avoid supplying large array _recipient, as this will exceed the block gas limit and cause function to revert
          tokenId++;  
          _safeMint(_recipient[i], tokenId);
        }
  }
  // Return Owner Address
  function walletOfOwner(address _owner) external view returns (uint256[] memory) {
    uint256 ownerTokenCount = balanceOf(_owner);
    uint256[] memory tokenIds = new uint256[](ownerTokenCount);
    for (uint256 i; i < ownerTokenCount; i++) { // @audit gas - use unchecked { i++ } when iterating over arrays as it cant overflow, ++i is cheaper than i++
      tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
    }
    return tokenIds;
  }

  // Returns Pinata Link for referenced NFT
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    // Require tokenId to exist, If Id does not exist return error message
    require(
      _exists(tokenId),
      "ERC721Metadata: URI query for nonexistent token"
    );
    
    // If NFTs not revealed return notRevealedUri, else return URI
    if(revealed == false) {
        return notRevealedUri;
    }
    string memory currentBaseURI = _baseURI();
    return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), baseExtension))
        : "";
  }

  //only owner can reveal NFTs
  function reveal() external onlyOwner {
      revealed = true;
  }
  
  //Set Cost of NFT mint
  function setCost(uint256 _newCost) external onlyOwner { // @audit medium - missing events for critical state changes, gives admin too much privelege
    cost = _newCost;
  }
  
  //Set URI of not revealed NFT
  function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
    notRevealedUri = _notRevealedURI;
  }

  //Set URI of NFT
  function setBaseURI(string memory _newBaseURI) public onlyOwner {
    baseURI = _newBaseURI;
  }

  //Set Base Extension
  function setBaseExtension(string memory _newBaseExtension) external onlyOwner {
    baseExtension = _newBaseExtension;
  }

  //Pause NFT Minting
  function pause(bool _state) external onlyOwner { // @audit medium - use two-step changes for critical state changes to give users sufficient time to react
    paused = _state;
  }
 
  //Withdraw funds from contract to Owner Address
  function withdraw() external payable onlyOwner {
    // Do not remove this otherwise you will not be able to withdraw the funds.
    // =============================================================================
    (bool os, ) = payable(owner()).call{value: address(this).balance}("");
    require(os);
    // =============================================================================
  }
}