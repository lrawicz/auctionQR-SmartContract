import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DailyAuction } from "../target/types/daily_auction";

describe("daily-auction", async() => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.dailyAuction as Program<DailyAuction>;

  const auctionAccount = anchor.web3.Keypair.generate();
  const initialContent = "Hello World";
  const acounts = [anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate()];
  it("01 - airdrop", async () => {
    await Promise.all(acounts.map(async (account) => {
      const airdropSignature = await program.provider.connection.requestAirdrop(
        account.publicKey,
        1000000000 // 1 SOL
      );
      await program.provider.connection.confirmTransaction(airdropSignature);
    }));
  })
  it("02 -Is initialized!", async () => {
    const tx = await program.methods
      .initialize(initialContent)
      .accounts({
        auction: auctionAccount.publicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([auctionAccount])
      .rpc();
    console.log("");
    console.log("");
    console.log("STEP 01------------------------------------");
    console.log("Your transaction signature", tx);

    const auction = await program.account.auction.fetch(auctionAccount.publicKey);
    console.log("Auction data:", auction);
  });
  it(" TEST01", async () => {
    const auctionInfo = await program.provider.connection.getAccountInfo(auctionAccount.publicKey);
    if (auctionInfo) {
      console.log("Auction account balance (lamports):", auctionInfo.lamports);
      console.log("Auction account balance (SOL):", auctionInfo.lamports / anchor.web3.LAMPORTS_PER_SOL);
    } else {
      console.log("Auction account not found.");
    }
  })

  it("03 - Allows a bid to be placed", async () => {
    const bidAmount = new anchor.BN(100000000); // 0.1 SOL
    const newContent = "New content for auction";

    const tx = await program.methods
      .bid(bidAmount, newContent)
      .accounts({
        auction: auctionAccount.publicKey,
        bidder: acounts[0].publicKey, //bidder.publicKey,
        oldBidder: anchor.web3.Keypair.generate().publicKey, // Dummy account for first bid
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([acounts[0]])
      .rpc();

    console.log("");
    console.log("");
    console.log("STEP 02------------------------------------");
    console.log("Your transaction signature", tx);

    const auction = await program.account.auction.fetch(auctionAccount.publicKey);
    console.log("Auction data after bid:", auction);

  });
  if (false)
  it("04 - Does not allow a bid lower than the previous one", async () => {
    const bidAmount = new anchor.BN(50000000); // Lower than previous bid
    const newContent = "Attempting lower bid";

    try {
      await program.methods
        .bid(bidAmount, newContent)
        .accounts({
          auction: auctionAccount.publicKey,
          bidder: acounts[1].publicKey,
          oldBidder: acounts[0].publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([acounts[1]])
        .rpc();
      // If the transaction doesn't throw an error, fail the test
      throw new Error("Transaction did not fail as expected.");
    } catch (error) {
      // Assert that the error is an AnchorError and has the correct error code
      if (error instanceof anchor.AnchorError) {
        console.log("Error code:", error.error.errorCode.code);
        // Assuming 'BidTooLow' is the error name in your Rust program
        // You might need to adjust this based on the actual error name/code
        if (error.error.errorCode.code !== "BidTooLow") {
          throw new Error(`Expected BidTooLow error, but got ${error.error.errorCode.code}`);
        }
      } else {
        throw error; // Re-throw other errors
      }
    }
  })
  it(" 05 - get data", async () => {
    const auction = await program.account.auction.fetch(auctionAccount.publicKey);
    console.log("Auction data:", auction);
    console.log(acounts.map(a => a.publicKey.toBase58()));

    const auctionInfo = await program.provider.connection.getAccountInfo(auctionAccount.publicKey);
    if (auctionInfo) {
      console.log("Auction account balance (lamports):", auctionInfo.lamports);
      console.log("Auction account balance (SOL):", auctionInfo.lamports / anchor.web3.LAMPORTS_PER_SOL);
    } else {
      console.log("Auction account not found.");
    }
  })

  it(" 06 - Allows a bid to be placed", async () => {
    const bidAmount = new anchor.BN(110000000); // 0.11 SOL
    const newContent = "second new content";

    const tx = await program.methods
      .bid(bidAmount, newContent)
      .accounts({
        auction: auctionAccount.publicKey,
        bidder: acounts[1].publicKey,
        oldBidder: acounts[0].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([acounts[1]])
      .rpc();

    console.log("");
    console.log("");
    console.log("STEP 02------------------------------------");
    console.log("Your transaction signature", tx);

    const auction = await program.account.auction.fetch(auctionAccount.publicKey);
    console.log("Auction data after bid:", auction);

  });
});