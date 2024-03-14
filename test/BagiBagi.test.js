const { assert, expect } = require("chai");

let accounts;
let contract;

/*
beforeEach(async function () {
  accounts = await ethers.getSigners();
  contract = await ethers.deployContract("BagiBagi");
  const contractAddress = await contract.getAddress();

  console.log("Contract address:", await contract.getAddress());
});
*/

describe("BagiBagi contract", function () {

  it("Deploy contract", async function () {
    accounts = await ethers.getSigners();
    contract = await ethers.deployContract("BagiBagi");
    const contractAddress = await contract.getAddress();

    console.log("Contract address:", await contract.getAddress());
    assert.ok(contractAddress);
  });

  it("Create BagiBagi Fixed Amount", async function () {
    const sender = accounts[0];
    // use only two receiver to make testing easier
    const txn = await contract.connect(sender).createGiftFixed([accounts[1].getAddress(), accounts[2].getAddress()], ethers.parseEther("0.5"), { value: ethers.parseEther("1") });
    //console.log(txn);
    const giftSender = (await contract.Gifts(0))[2];

    assert.equal(await sender.getAddress(), giftSender);
  });

  it("Create BagiBagi Fixed Amount with incorrect amount sent", async function () {
    expect(async () => await contract.connect(accounts[4]).createGiftFixed([accounts[1].getAddress(), accounts[2].getAddress()], ethers.parseEther("0.3"), { value: ethers.parseEther("1") }).to.be.revertedWith("Incorrect amount sent."));
  });

  it("Claim BagiBagi by receiver 1", async function () {
    const claimer = accounts[1];
    const claimerAddress = claimer.getAddress();
    const initialBalance = await ethers.provider.getBalance(claimerAddress);
    const receivableAmount = await contract.getReceivableAmount(0, claimerAddress);
    // console.log(initialBalance);
    const txn = await contract.connect(claimer).claimGift(0);

    // transaction receipts is available when block is mined, includes gas used and gas price
    const transactionReceipt = await txn.wait(1);
    const { gasUsed, gasPrice } = transactionReceipt;

    const gasCost = gasUsed * gasPrice;
    // console.log("Gas Used: ", ethers.formatEther(gasCost));

    const newBalance = await ethers.provider.getBalance(claimerAddress);
    const amountReceived = newBalance - (initialBalance - gasCost);
    // console.log("Amount received: ", newBalance - (initialBalance - gasCost));

    assert.equal(receivableAmount, amountReceived);

  });

  it("Claim BagiBagi by non-receiver", async function () {
    const claimer = accounts[3];
    const claimerAddress = claimer.getAddress();

    const receivableAmount = await contract.getReceivableAmount(0, claimerAddress);
    // console.log(receivableAmount);

    expect(async () => await contract.connect(claimer).claimGift(0)).to.be.revertedWith("Not eligible receiver.");

  });

  it("Non-sender withdraw unclaimed gift", async function () {
    const withdrawer = accounts[3];
    // you can try console log the sender of the Gift and the claimer address
    expect(async () => await contract.connect(withdrawer).withdrawGift(0)).to.be.revertedWith("Only gift sender can withdraw.");
  });

  it("First gifts claimed by all receiver", async function () {
    const claimer = accounts[2];
    const claimerAddress = claimer.getAddress();

    await contract.connect(claimer).claimGift(0);

    const receivableAmount = await contract.getReceivableAmount(0, claimerAddress);

    assert.equal(receivableAmount, 0);

  });

  it("Sender withdraw gift that has been fully claimed", async function () {
    const withdrawer = accounts[0];
    // you can try console log the sender of the Gift and the claimer address
    expect(async () => await contract.connect(withdrawer).withdrawGift(0)).to.be.revertedWith("All gifts are claimed.");
  });

  it("Create BagiBagi Custom Amount", async function () {
    const sender = accounts[6];
    // use only two receiver to make testing easier
    const txn = await contract.connect(sender).createGiftCustom([accounts[1].getAddress(), accounts[2].getAddress()], [ethers.parseEther("0.5"), ethers.parseEther("0.2")], { value: ethers.parseEther("0.7") });
    //console.log(txn);
    const giftSender = (await contract.Gifts(1))[2];
    const giftTotalAmount = (await contract.Gifts(1))[1];
    assert.equal(giftTotalAmount, ethers.parseEther("0.7"));
  });

  it("Create BagiBagi Custom Amount with incorrect amount sent", async function () {
    expect(async () => await contract.connect(sender).createGiftCustom([accounts[1].getAddress(), accounts[2].getAddress()], [ethers.parseEther("0.5"), ethers.parseEther("0.2")], { value: ethers.parseEther("2") })).to.be.revertedWith("Incorrect amount sent.");

  });

  it("Sender withdraw unclaimed gifts successfully", async function () {
    const withdrawer = accounts[6];
    const withdrawerAddress = withdrawer.getAddress();
    const initialBalance = await ethers.provider.getBalance(withdrawerAddress);
    const giftTotalAmount = (await contract.Gifts(1))[1];
    // console.log(initialBalance);
    const txn = await contract.connect(withdrawer).withdrawGift(1);

    // transaction receipts is available when block is mined, includes gas used and gas price
    const transactionReceipt = await txn.wait(1);
    const { gasUsed, gasPrice } = transactionReceipt;

    const gasCost = gasUsed * gasPrice;
    // console.log("Gas Used: ", ethers.formatEther(gasCost));

    const newBalance = await ethers.provider.getBalance(withdrawerAddress);
    const amountReceived = newBalance - (initialBalance - gasCost);
    // console.log("Amount received: ", newBalance - (initialBalance - gasCost));

    assert.equal(giftTotalAmount, amountReceived);
  });

  it("Receiver fails to claim withdrawn gift", async function () {
    const claimer = accounts[2];
    const claimerAddress = claimer.getAddress();

    const receivableAmount = await contract.getReceivableAmount(1, claimerAddress);
    // console.log(receivableAmount);

    expect(async () => await contract.connect(claimer).claimGift(0)).to.be.revertedWith("Gift has been withdrawn by the sender.");
  });

}); 
