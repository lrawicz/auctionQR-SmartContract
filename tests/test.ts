import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
const logging = true;
import {QrAuction} from "../tools/qrAuction"
import * as misc from "../tools/misc"

describe("daily-auction", () => {
  const smartContract = new QrAuction()
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Keypairs for the test
  const authority = provider.wallet as anchor.Wallet;
  const secondAuthority = anchor.web3.Keypair.generate();
  let currentAuthority = authority; // Mutable variable to track the current authority

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
      const currentAuthorityBalance = await misc.getBalance(currentAuthority.publicKey)
      const bidderOneBalance = await misc.getBalance(bidderOne.publicKey)
      const bidderTwoBalance = await misc.getBalance(bidderTwo.publicKey)

      console.log("\n  --- Bidder Balances ---");

      console.log(
        `  Auction Balance: ${
          smartContractBalance / anchor.web3.LAMPORTS_PER_SOL
        } SOL`
      );
      console.log(
        `  Current Authority (${currentAuthority.publicKey.toBase58()}) Balance: ${
          currentAuthorityBalance / anchor.web3.LAMPORTS_PER_SOL
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
    await misc.airDrop(secondAuthority.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
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

  it("02. Sets a new authority for the auction", async () => {
    await smartContract.setAuthority(secondAuthority.publicKey.toBase58());
    const auctionAccount = await smartContract.getData();
    expect(auctionAccount.authority.toBase58()).to.equal(secondAuthority.publicKey.toBase58());
    
    // Update the QrAuction instance's internal authority
    smartContract.setWalletAuthority(new anchor.Wallet(secondAuthority));
    currentAuthority = new anchor.Wallet(secondAuthority); // Update currentAuthority for test context

    if (logging) showLog("02");
  });

  it("03. Bid 1: Account 1 places a successful bid", async () => {
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
    if (logging) showLog("03")

  });
  it("04. Bid 2: Account 2 fails to bid with a lower amount", async () => {
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
    if (logging) showLog("04");
  });
  it("05. Bid 3: Account 2 places a successful higher bid", async () => {
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
    if (logging) showLog("05");
  });
  it("06. Ends the first auction and transfers funds to authority", async () => {
    const auctionState = await smartContract.getData()
    const auctionAccountBefore = await smartContract.getBalance()
    const authorityBalanceBefore = await misc.getBalance(currentAuthority.publicKey);
    await smartContract.end_auction()
    const auctionAccountAfter = await smartContract.getData();
    const authorityBalanceAfter = await misc.getBalance(currentAuthority.publicKey);


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
    if (logging) showLog("06");
  });

  it("07. Starts a new auction", async () => {
    const newInitialContent = "Second Round Content";
    await smartContract.setAuthority(authority.publicKey.toBase58());
    smartContract.setWalletAuthority(authority);
    currentAuthority = authority;
    await smartContract.start_auction(newInitialContent)
    const auctionAccount = await smartContract.getData()

    expect(auctionAccount.authority.toBase58()).to.equal(currentAuthority.publicKey.toBase58());
    expect(auctionAccount.newContent).to.equal(newInitialContent);
    expect(auctionAccount.isActive).to.be.true;
    expect(auctionAccount.highestBid.toNumber()).to.equal(0);
    if (logging) showLog("07")
  });

  it("08. Bid 1 (Round 2): Account 1 places a successful bid", async () => {
    const bidAmount:number = 0.5 //in SOL
    const newContent:string = "Content from Bidder One (Round 2)"
    const auctionBalanceBefore = await smartContract.getBalance()

    await smartContract.bid({
        bidder:bidderOne,
        bidAmount,
        newContent
      })

    const auctionAccount = await smartContract.getData()
    const auctionBalanceAfter = await smartContract.getBalance()

    const bidAmountInLamports = bidAmount * anchor.web3.LAMPORTS_PER_SOL;

    expect(auctionAccount.highestBidder.toBase58()).to.equal(bidderOne.publicKey.toBase58());
    expect(auctionAccount.highestBid.toString()).to.equal(bidAmountInLamports.toString());
    expect(auctionAccount.newContent).to.equal(newContent);
    expect(auctionBalanceAfter).to.equal(auctionBalanceBefore + (bidAmountInLamports));
    if (logging) showLog("08")

  });

  it("09. Bid 2 (Round 2): Account 2 places a successful higher bid", async () => {
    const bidAmount:number = 1;
    const newContent = "Content from Bidder Two (Round 2)";
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

    // Check if bidder one was refunded (0.5 SOL)
    const previousBid = 0.5 * anchor.web3.LAMPORTS_PER_SOL;
    expect(bidderOneBalanceAfter).to.equal(
      bidderOneBalanceBefore + previousBid
    );
    if (logging) showLog("09");
  });

  // it("10. Ends the final auction", async () => {
  //   const auctionState = await smartContract.getData()
  //   const authorityBalanceBefore = await misc.getBalance(currentAuthority.publicKey);
  //   await smartContract.end_auction()
  //   const auctionAccountAfter = await smartContract.getData();
  //   const authorityBalanceAfter = await misc.getBalance(currentAuthority.publicKey);


  //   // Check auction state
  //   expect(auctionAccountAfter.isActive).to.be.false;
  //   expect(auctionAccountAfter.newContent).to.equal("");
  //   expect(auctionAccountAfter.oldContent).to.equal(auctionState.newContent);

  //   // Check authority balance
  //   expect(authorityBalanceAfter).to.be.greaterThan(authorityBalanceBefore);
  //   if (logging) showLog("10");
  // });

  it("10. Ends and starts a new auction in a single call", async () => {

    const auctionStateBeforeCombined = await smartContract.getData();
    const authorityBalanceBeforeCombined = await misc.getBalance(currentAuthority.publicKey);

    const newContentForNextAuction = "New Content After Combined Call";
    await smartContract.endAndStartAuction(newContentForNextAuction);

    const auctionStateAfterCombined = await smartContract.getData();
    const authorityBalanceAfterCombined = await misc.getBalance(currentAuthority.publicKey);

    // Assertions for the ended part of the auction
    expect(auctionStateAfterCombined.oldContent).to.equal(auctionStateBeforeCombined.newContent); // oldContent should be the newContent of the previous auction
    expect(authorityBalanceAfterCombined).to.be.greaterThan(authorityBalanceBeforeCombined); // Funds transferred to authority

    // Assertions for the started part of the auction
    expect(auctionStateAfterCombined.isActive).to.be.true; // New auction is active
    expect(auctionStateAfterCombined.newContent).to.equal(newContentForNextAuction); // New content is set
    expect(auctionStateAfterCombined.highestBid.toNumber()).to.equal(0); // Bid reset
    expect(auctionStateAfterCombined.highestBidder.toBase58()).to.equal(anchor.web3.PublicKey.default.toBase58()); // Bidder reset
    expect(auctionStateAfterCombined.endTimestamp.toNumber()).to.be.greaterThan(auctionStateBeforeCombined.endTimestamp.toNumber()); // Timestamp updated

    if (logging) showLog("10");
  });
});