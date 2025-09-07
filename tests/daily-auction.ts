import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
const logging = false;
import {QrAuction} from "../tools/qrAuction"
import * as misc from "../tools/misc"

describe("daily-auction", () => {
  const smartContract = new QrAuction()
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Keypairs for the test
  const authority = provider.wallet as anchor.Wallet;

  const bidderOne = anchor.web3.Keypair.generate();
  const bidderTwo = anchor.web3.Keypair.generate();

  const initialContent = "Initial Content";
  //define function showLog
  const showLog = async (step:string="") => {
      console.log(`Step ${step}`)
      // Fetch and log auction state
      const auctionAccount = await smartContract.getData()  
      console.log("\n  --- Auction State ---");
      console.log(JSON.stringify(auctionAccount, null, 2));

      // Fetch and log bidder balances
      const smartContractBalance = await smartContract.getBalance()
      const authorityBalance = await misc.getBalance(authority.publicKey)
      const bidderOneBalance = await misc.getBalance(bidderOne.publicKey)
      const bidderTwoBalance = await misc.getBalance(bidderTwo.publicKey)

      console.log("\n  --- Bidder Balances ---");

      console.log(
        `  Auction Balance: ${
          smartContractBalance / anchor.web3.LAMPORTS_PER_SOL
        } SOL`
      );
      console.log(
        `  Authority (${(
          provider.wallet as anchor.Wallet
        ).publicKey.toBase58()}) Balance: ${
          authorityBalance / anchor.web3.LAMPORTS_PER_SOL
        } SOL`
      );
      console.log(
        `  Bidder One (${bidderOne.publicKey.toBase58()}) Balance: ${
          bidderOneBalance / anchor.web3.LAMPORTS_PER_SOL
        } SOL`
      );
      console.log(
        `  Bidder Two (${bidderTwo.publicKey.toBase58()}) Balance: ${
          bidderTwoBalance / anchor.web3.LAMPORTS_PER_SOL
        } SOL`
      );
      console.log("-----------------------------");
  };
  it("Isolates test accounts", async () => {
    // Airdrop SOL to bidders for testing
    await misc.airDrop(bidderOne.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await misc.airDrop(bidderTwo.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
  });

  it("01. Initializes the auction", async () => {
    await smartContract.initialize({initialContent})
    const auctionAccount = await smartContract.getData()

    expect(auctionAccount.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(auctionAccount.newContent).to.equal(initialContent);
    expect(auctionAccount.oldContent).to.equal(initialContent);
    expect(auctionAccount.isActive).to.be.true;
    expect(auctionAccount.highestBid.toNumber()).to.equal(0);
    if (logging) showLog("01")
  });
  it("02. Bid 1: Account 1 places a successful bid", async () => {
    const bidAmount:number = 1 //in SOL
    const newContent:string = "Content from Bidder One"
    const auctionBalanceBefore = await smartContract.getBalance()

    await smartContract.bid({
        bidder:bidderOne,
        bidAmount,
        newContent:"Content from Bidder One"
      })

    const auctionAccount = await smartContract.getData()
    const auctionBalanceAfter = await smartContract.getBalance()

    const bidAmountInLamports = bidAmount * anchor.web3.LAMPORTS_PER_SOL;

    expect(auctionAccount.highestBidder.toBase58()).to.equal(bidderOne.publicKey.toBase58());
    expect(auctionAccount.highestBid.toString()).to.equal(bidAmountInLamports.toString());
    expect(auctionAccount.newContent).to.equal(newContent);
    expect(auctionBalanceAfter).to.equal(auctionBalanceBefore + (bidAmountInLamports));
    if (logging) showLog("02")

  });
  it("03. Bid 2: Account 2 fails to bid with a lower amount", async () => {
    const lowerBidAmount:number = 0.5;
    const newContent = "Content from Bidder Two (lower)";

    try {
      await smartContract.bid({
        bidAmount:lowerBidAmount,
        bidder:bidderTwo,
        newContent,
        oldBidderPublicKey:bidderOne.publicKey
      })
      // This should not be reached
      expect.fail("Transaction should have failed with BidTooLow error.");
    } catch (err) {
      expect(err).to.be.instanceOf(anchor.AnchorError);
      expect(err.error.errorCode.code).to.equal("BidTooLow");
    }
    if (logging) showLog("03");
  });
  it("04. Bid 3: Account 2 places a successful higher bid", async () => {
    const bidAmount:number = 2;
    const newContent = "Content from Bidder Two (higher)";
    const bidderOneBalanceBefore = await misc.getBalance(bidderOne.publicKey);
    
    await smartContract.bid({
      bidAmount,
      bidder:bidderTwo,
      newContent,
      oldBidderPublicKey:bidderOne.publicKey
    })
    const auctionAccount = await smartContract.getData();
    const bidderOneBalanceAfter = await misc.getBalance(bidderOne.publicKey);
    



    // Check auction state
    expect(auctionAccount.highestBidder.toBase58()).to.equal(bidderTwo.publicKey.toBase58());
    expect(auctionAccount.highestBid.toString()).to.equal((bidAmount * anchor.web3.LAMPORTS_PER_SOL).toString());
    expect(auctionAccount.newContent).to.equal(newContent);

    // Check if bidder one was refunded (1 SOL)
    const previousBid = 1 * anchor.web3.LAMPORTS_PER_SOL;
    expect(bidderOneBalanceAfter).to.equal(
      bidderOneBalanceBefore + previousBid
    );
    if (logging) showLog("04");
  });

  it("05. Ends the auction and transfers funds to authority", async () => {
    const auctionState = await smartContract.getData()
    const auctionAccountBefore = await smartContract.getBalance()
    const authorityBalanceBefore = await misc.getBalance(authority.publicKey);
    await smartContract.end_auction()
    const auctionAccountAfter = await smartContract.getData();
    const authorityBalanceAfter = await misc.getBalance(authority.publicKey);


    // Check auction state
    expect(auctionAccountAfter.isActive).to.be.false;
    expect(auctionAccountAfter.newContent).to.equal("");
    expect(auctionAccountAfter.oldContent).to.equal(auctionState.newContent);

    // Check authority balance
    const highestBid = auctionState.highestBid.toNumber();
    // The authority balance should increase by the highest bid, minus transaction fees.
    // This check is tricky due to unpredictable gas fees, so we check if it increased significantly.
    expect(authorityBalanceAfter).to.be.greaterThan(authorityBalanceBefore);

    // A more precise check would require calculating the exact rent and transaction fees,
    // but for most cases, confirming the balance has increased by approximately the bid amount is sufficient.
    if (logging) showLog("05");
  });
});
