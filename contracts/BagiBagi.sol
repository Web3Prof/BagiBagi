// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract BagiBagi {
    uint256 public giftId;

    /// @dev 'totalAmount' indicates the amount left to claim, zero means all gifts are claimed or sender has withdrawn unclaimed gifts
    struct Gift {
        uint256 id;
        uint256 totalAmount;
        address sender;
        mapping(address => uint256) receiverToAmount;
    }

    mapping(uint256 => Gift) public Gifts;

    function createGiftFixed(
        address[] calldata receivers,
        uint256 amount
    ) external payable returns (uint256) {
        require(
            msg.value == (receivers.length * amount),
            "Incorrect amount sent."
        );

        Gift storage newGift = Gifts[giftId];
        newGift.id = giftId;
        newGift.totalAmount = msg.value;
        newGift.sender = msg.sender;

        for (uint i = 0; i < receivers.length; i++) {
            newGift.receiverToAmount[receivers[i]] = amount;
        }

        giftId++;
        return newGift.id;
    }

    function createGiftCustom(
        address[] calldata receivers,
        uint256[] calldata amounts
    ) external payable returns (uint256) {
        uint256 totalAmount;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value == totalAmount, "Incorrect amount sent.");

        Gift storage newGift = Gifts[giftId];
        newGift.id = giftId;
        newGift.totalAmount = msg.value;
        newGift.sender = msg.sender;

        for (uint i = 0; i < receivers.length; i++) {
            newGift.receiverToAmount[receivers[i]] = amounts[i];
        }

        giftId++;
        return newGift.id;
    }

    function getReceivableAmount(
        uint256 currGiftId,
        address claimer
    ) external view returns (uint256 amount) {
        Gift storage gift = Gifts[currGiftId];
        return gift.receiverToAmount[claimer];
    }

    /// @param currGiftId is the id of the Gift which will be claimed
    /// @dev set receiverToAmount (receivable amount) to zero once claimed
    function claimGift(uint256 currGiftId) external {
        Gift storage gift = Gifts[currGiftId];

        require(
            gift.receiverToAmount[msg.sender] > 0,
            "Not eligible receiver."
        );

        require(gift.totalAmount > 0, "Gift has been withdrawn by the sender.");

        // Following the Checks-Effects-Interactions Pattern
        // Check
        require(
            address(this).balance >= gift.receiverToAmount[msg.sender],
            "Insufficient contract balance."
        );

        // Effects
        uint256 receivedAmount = gift.receiverToAmount[msg.sender];
        gift.totalAmount -= gift.receiverToAmount[msg.sender];
        gift.receiverToAmount[msg.sender] = 0;

        // Interactions
        (bool sent, ) = msg.sender.call{value: receivedAmount}("");
        require(sent, "Failed to claim gift.");
    }

    function withdrawGift(uint256 currGiftId) external {
        Gift storage gift = Gifts[currGiftId];
        require(gift.sender == msg.sender, "Only gift sender can withdraw.");
        require(gift.totalAmount > 0, "All gifts are claimed.");

        // Following the Checks-Effects-Interactions Pattern
        // Check
        require(
            address(this).balance >= gift.totalAmount,
            "Insufficient contract balance."
        );

        // Effects
        uint256 withdrawAmount = gift.totalAmount;
        gift.totalAmount = 0;

        // Interactions
        (bool sent, ) = msg.sender.call{value: withdrawAmount}("");
        require(sent, "Failed to withdraw gift.");
    }
}
