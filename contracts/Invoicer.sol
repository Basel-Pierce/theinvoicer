// SPDX-License-Identifier: MIT

/**
 * ____                 _            _____ _                   
 *|  _ \               | |   ___    |  __ (_)                  
 *| |_) | __ _ ___  ___| |  ( _ )   | |__) |  ___ _ __ ___ ___ 
 *|  _ < / _` / __|/ _ \ |  / _ \/\ |  ___/ |/ _ \ '__/ __/ _ \
 *| |_) | (_| \__ \  __/ | | (_>  < | |   | |  __/ | | (_|  __/
 *|____/ \__,_|___/\___|_|  \___/\/ |_|   |_|\___|_|  \___\___|
 *
 * https://www.baselpierce.biz/
 *
**/

pragma solidity ^0.8.0;

import "./Counters.sol";
import "./ReentrancyGuard.sol";
import "./TRC721URIStorage.sol";
import "./TRC721.sol";
import "./ITRC20.sol";

contract Invoicer is ReentrancyGuard, TRC721URIStorage {

    using Counters for Counters.Counter;
    Counters.Counter private _invoiceIds;
    address payable owner;
    uint256 creationPrice = 0 trx;
    uint256 payPrice = 1 trx;

    struct ListedInvoice {
        uint256 invoiceId;
        address payable seller;
        uint256 amount;
        address token;
        bool currentlyListed;
        uint createdAt;
        uint paidAt;
        address paidBy;
    }

    event InvoiceListed (
        uint256 indexed invoiceId,
        address seller,
        uint256 amount,
        address token,
        bool currentlyListed,
        uint createdAt
    );

    event InvoicePaid (
        uint256 indexed invoiceId,
        address seller,
        uint256 amount,
        address token,
        uint paidAt,
        address paidBy
    );

    mapping(uint256 => ListedInvoice) private idToListedInvoice;

    constructor() TRC721("Invoicer", "NVCR") {
        owner = payable(msg.sender);
    }

    function updateCreationPrice(uint256 _creationPrice) public {
        require(owner == msg.sender, "Only owner can update the creation invoice price");
        creationPrice = _creationPrice;
    }

    function updatePayPrice(uint256 _payPrice) public {
        require(owner == msg.sender, "Only owner can update the pay invoice price");
        payPrice = _payPrice;
    }

    function getCreationPrice() public view returns (uint256) {
        return creationPrice;
    }

    function getPayPrice() public view returns (uint256) {
        return payPrice;
    }

    function getInvoiceById(uint256 invoiceId) public view returns (
        uint256 dataInvoiceId,
        address dataSeller,
        uint256 dataAmount,
        address dataToken,
        bool dataCurrentlyListed,
        uint dataCreatedAt,
        uint dataPaidAt,
        address dataPaidBy
    ) {
        ListedInvoice memory _listedInvoice = idToListedInvoice[invoiceId];
        dataInvoiceId = _listedInvoice.invoiceId;
        dataSeller = _listedInvoice.seller;
        dataAmount = _listedInvoice.amount;
        dataToken =  _listedInvoice.token;
        dataCurrentlyListed = _listedInvoice.currentlyListed;
        dataCreatedAt =  _listedInvoice.createdAt;
        dataPaidAt = _listedInvoice.paidAt;
        dataPaidBy = _listedInvoice.paidBy;
    }

    function createInvoice(string memory tokenURI, uint256 amount, address token) public payable nonReentrant returns (uint) {
        require(msg.value == creationPrice, "You must pay the fee");
        require(amount > 0, "Amount should be greater than zero");
        
        _invoiceIds.increment();
        uint256 newInvoiceId = _invoiceIds.current();

        _safeMint(msg.sender, newInvoiceId);
        _setTokenURI(newInvoiceId, tokenURI);
        createNewInvoice(newInvoiceId, amount, token);

        return newInvoiceId;
    }

    function createNewInvoice(uint256 invoiceId, uint256 amount, address token) private {
        uint dateNow = block.timestamp;

        idToListedInvoice[invoiceId] = ListedInvoice(
            invoiceId,
            payable(msg.sender),
            amount,
            token,
            true,
            dateNow,
            0,
            address(0)
        );

        _transfer(msg.sender, address(this), invoiceId);

        payable(owner).transfer(msg.value);

        emit InvoiceListed(
            invoiceId,
            msg.sender,
            amount,
            token,
            true,
            dateNow
        );
    }
    
    function getCreatedInvoices() public view returns (
        uint256[] memory dataInvoiceId,
        uint256[] memory dataAmount,
        address[] memory dataToken,
        bool[] memory dataCurrentlyListed,
        uint[] memory dataCreatedAt,
        uint[] memory dataPaidAt
    ) {
        uint totalItemCount = _invoiceIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        uint currentId;

        for (uint i=0; i < totalItemCount; i++)
        {
            if (idToListedInvoice[i+1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        uint256[] memory _dataInvoiceId = new uint256[](itemCount);
        uint256[] memory _dataAmount = new uint256[](itemCount);
        address[] memory _dataToken = new address[](itemCount);
        bool[] memory _dataCurrentlyListed = new bool[](itemCount);
        uint[] memory _dataCreatedAt = new uint[](itemCount);
        uint[] memory _dataPaidAt = new uint[](itemCount);

        for (uint i=0; i < totalItemCount; i++) {
            if (idToListedInvoice[i+1].seller == msg.sender) {
                currentId = i+1;
                ListedInvoice storage currentItem = idToListedInvoice[currentId];
                _dataInvoiceId[currentIndex] = currentItem.invoiceId;
                _dataAmount[currentIndex] = currentItem.amount;
                _dataToken[currentIndex] = currentItem.token;
                _dataCurrentlyListed[currentIndex] = currentItem.currentlyListed;
                _dataCreatedAt[currentIndex] = currentItem.createdAt;
                _dataPaidAt[currentIndex] = currentItem.paidAt;
                currentIndex += 1;
            }
        }

        return (_dataInvoiceId, _dataAmount, _dataToken, _dataCurrentlyListed, _dataCreatedAt, _dataPaidAt);
    }

    function getPaidInvoices() public view returns (
        uint256[] memory dataInvoiceId,
        uint256[] memory dataAmount,
        address[] memory dataToken,
        uint[] memory dataCreatedAt,
        uint[] memory dataPaidAt
    ) {
        uint totalItemCount = _invoiceIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        uint currentId;

        for (uint i=0; i < totalItemCount; i++)
        {
            if (idToListedInvoice[i+1].paidBy == msg.sender) {
                itemCount += 1;
            }
        }

        uint256[] memory _dataInvoiceId = new uint256[](itemCount);
        uint256[] memory _dataAmount = new uint256[](itemCount);
        address[] memory _dataToken = new address[](itemCount);
        uint[] memory _dataCreatedAt = new uint[](itemCount);
        uint[] memory _dataPaidAt = new uint[](itemCount);

        for (uint i=0; i < totalItemCount; i++) {
            if (idToListedInvoice[i+1].paidBy == msg.sender) {
                currentId = i+1;
                ListedInvoice storage currentItem = idToListedInvoice[currentId];
                _dataInvoiceId[currentIndex] = currentItem.invoiceId;
                _dataAmount[currentIndex] = currentItem.amount;
                _dataToken[currentIndex] = currentItem.token;
                _dataCreatedAt[currentIndex] = currentItem.createdAt;
                _dataPaidAt[currentIndex] = currentItem.paidAt;
                currentIndex += 1;
            }
        }

        return (_dataInvoiceId, _dataAmount, _dataToken, _dataCreatedAt, _dataPaidAt);
    }

    function payInvoice(uint256 invoiceId, uint256 invoiceAmount) public payable nonReentrant {
        require(msg.value == payPrice, "You must pay the fee");

        uint amount = idToListedInvoice[invoiceId].amount;
        address seller = idToListedInvoice[invoiceId].seller;
        bool currentlyListed = idToListedInvoice[invoiceId].currentlyListed;
        address token = idToListedInvoice[invoiceId].token;
        uint dateNow = block.timestamp;
        
        require(
            currentlyListed == true,
            "The invoice is not listed"
        );
        require(
            invoiceAmount == amount,
            "Please submit the asking amount in order to close the invoice"
        );
        
        ITRC20 trc20Token = ITRC20(address(token));
        
        require(
            invoiceAmount <= trc20Token.balanceOf(msg.sender),
            "You dont have enough balance to pay the invoice"
        );
        require(
            trc20Token.allowance(msg.sender, address(this)) >= invoiceAmount,
            "Please approve tokens before transferring"
        );

        trc20Token.transferFrom(
            msg.sender,
            seller,
            invoiceAmount
        );

        string memory _tokenURI = string(abi.encodePacked(tokenURI(invoiceId), "_paid"));
        _setTokenURI(invoiceId, _tokenURI);
        _transfer(address(this), msg.sender, invoiceId);

        idToListedInvoice[invoiceId].currentlyListed = false;
        idToListedInvoice[invoiceId].paidAt = dateNow;
        idToListedInvoice[invoiceId].paidBy = msg.sender;

        emit InvoicePaid(
            invoiceId,
            seller,
            amount,
            token,
            dateNow,
            msg.sender
        );
    }
}
