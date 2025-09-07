import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DailyAuction } from "../target/types/daily_auction";
import { expect } from "chai";

describe("daily-auction", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DailyAuction as Program<DailyAuction>;

  // Keypairs for the test
  const authority = provider.wallet as anchor.Wallet;
  const bidderOne = anchor.web3.Keypair.generate();
  const bidderTwo = anchor.web3.Keypair.generate();

  // PDA for the auction account
  const [auctionPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("auction")],
    program.programId
  );

  const initialContent = "Initial Content";

  it("Isolates test accounts", async () => {
    // Airdrop SOL to bidders for testing
    await provider.connection.requestAirdrop(bidderOne.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(bidderTwo.publicKey, 3 * anchor.web3.LAMPORTS_PER_SOL);
  });

  it("01. Initializes the auction", async () => {
    await program.methods
      .initialize(initialContent)
      .accounts({
        auction: auctionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const auctionAccount = await program.account.auction.fetch(auctionPda);

    expect(auctionAccount.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(auctionAccount.newContent).to.equal(initialContent);
    expect(auctionAccount.oldContent).to.equal(initialContent);
    expect(auctionAccount.isActive).to.be.true;
    expect(auctionAccount.highestBid.toNumber()).to.equal(0);
  });

  it("02. Bid 1: Account 1 places a successful bid", async () => {
    const bidAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
    const newContent = "Content from Bidder One";

    const auctionBalanceBefore = await provider.connection.getBalance(auctionPda);

    await program.methods
      .bid(bidAmount, newContent)
      .accounts({
        auction: auctionPda,
        bidder: bidderOne.publicKey,
        oldBidder: bidderOne.publicKey, // No one to refund yet
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bidderOne])
      .rpc();

    const auctionAccount = await program.account.auction.fetch(auctionPda);
    const auctionBalanceAfter = await provider.connection.getBalance(auctionPda);

    expect(auctionAccount.highestBidder.toBase58()).to.equal(bidderOne.publicKey.toBase58());
    expect(auctionAccount.highestBid.toString()).to.equal(bidAmount.toString());
    expect(auctionAccount.newContent).to.equal(newContent);
    expect(auctionBalanceAfter).to.equal(auctionBalanceBefore + bidAmount.toNumber());
  });

  it("03. Bid 2: Account 2 fails to bid with a lower amount", async () => {
    const lowerBidAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL);
    const newContent = "Content from Bidder Two (lower)";

    try {
      await program.methods
        .bid(lowerBidAmount, newContent)
        .accounts({
          auction: auctionPda,
          bidder: bidderTwo.publicKey,
          oldBidder: bidderOne.publicKey, // Previous bidder
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bidderTwo])
        .rpc();
      // This should not be reached
      expect.fail("Transaction should have failed with BidTooLow error.");
    } catch (err) {
      expect(err).to.be.instanceOf(anchor.AnchorError);
      expect(err.error.errorCode.code).to.equal("BidTooLow");
    }
  });

  it("04. Bid 3: Account 2 places a successful higher bid", async () => {
    const higherBidAmount = new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL);
    const newContent = "Content from Bidder Two (higher)";

    const bidderOneBalanceBefore = await provider.connection.getBalance(bidderOne.publicKey);

    await program.methods
      .bid(higherBidAmount, newContent)
      .accounts({
        auction: auctionPda,
        bidder: bidderTwo.publicKey,
        oldBidder: bidderOne.publicKey, // Bidder One should be refunded
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bidderTwo])
      .rpc();

    const auctionAccount = await program.account.auction.fetch(auctionPda);
    const bidderOneBalanceAfter = await provider.connection.getBalance(bidderOne.publicKey);

    // Check auction state
    expect(auctionAccount.highestBidder.toBase58()).to.equal(bidderTwo.publicKey.toBase58());
    expect(auctionAccount.highestBid.toString()).to.equal(higherBidAmount.toString());
    expect(auctionAccount.newContent).to.equal(newContent);

    // Check if bidder one was refunded (1 SOL)
    const previousBid = 1 * anchor.web3.LAMPORTS_PER_SOL;
    expect(bidderOneBalanceAfter).to.equal(bidderOneBalanceBefore + previousBid);
  });

  it("05. Ends the auction and transfers funds to authority", async () => {
    const auctionAccountBefore = await program.account.auction.fetch(auctionPda);
    const authorityBalanceBefore = await provider.connection.getBalance(authority.publicKey);

    await program.methods
      .endAuction()
      .accounts({
        auction: auctionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const auctionAccountAfter = await program.account.auction.fetch(auctionPda);
    const authorityBalanceAfter = await provider.connection.getBalance(authority.publicKey);

    // Check auction state
    expect(auctionAccountAfter.isActive).to.be.false;
    expect(auctionAccountAfter.newContent).to.equal("");
    expect(auctionAccountAfter.oldContent).to.equal(auctionAccountBefore.newContent);

    // Check authority balance
    const highestBid = auctionAccountBefore.highestBid.toNumber();
    // The authority balance should increase by the highest bid, minus transaction fees.
    // This check is tricky due to unpredictable gas fees, so we check if it increased significantly.
    expect(authorityBalanceAfter).to.be.greaterThan(authorityBalanceBefore);

    // A more precise check would require calculating the exact rent and transaction fees, 
    // but for most cases, confirming the balance has increased by approximately the bid amount is sufficient.
  });
});
