import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DailyAuction } from "../target/types/daily_auction";

describe("daily-auction", async() => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.dailyAuction as Program<DailyAuction>;

  const [auctionAccountPda, auctionAccountBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("auction")], program.programId);
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
        auction: auctionAccountPda,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      
      .rpc();
    console.log("");
    console.log("");
    console.log("STEP 01------------------------------------");
    console.log("Your transaction signature", tx);

    const auction = await program.account.auction.fetch(auctionAccountPda);
    console.log("Auction data:", auction);
  });
  it(" TEST01", async () => {
    const auctionInfo = await program.provider.connection.getAccountInfo(auctionAccountPda);
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

    // For the first bid, oldBidder can be a dummy or default Pubkey
    const oldBidderKey = anchor.web3.Keypair.generate().publicKey;

    const tx = await program.methods
      .bid(bidAmount, newContent)
      .accounts({
        auction: auctionAccountPda.publicKey,
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

    const auction = await program.account.auction.fetch(auctionAccountPda);
    console.log("Auction data:", auction);

  });
  if (false)
  it("04 - Does not allow a bid lower than the previous one", async () => {
    const bidAmount = new anchor.BN(50000000); // Lower than previous bid
    const newContent = "Attempting lower bid";

    try {
      await program.methods
        .bid(bidAmount, newContent)
        .accounts({
          auction: auctionAccountPda,
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
    const auction = await program.account.auction.fetch(auctionAccountPda);
    console.log("Auction data:", auction);
    console.log(acounts.map(a => a.publicKey.toBase58()));

    const auctionInfo = await program.provider.connection.getAccountInfo(auctionAccountPda);
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
    console.log("-----------------------------------");
    console.log("Auction PDA:", auctionAccountPda.toBase58());

    const auctionBeforeBid = await program.account.auction.fetch(auctionAccountPda);
    console.log("Auction data before second bid:", auctionBeforeBid);
    console.log("Highest bidder before second bid (oldBidderKey):", auctionBeforeBid.highestBidder.toBase58());
    const oldBidderKey = auctionBeforeBid.highestBidder;

    const auctionInfoBeforeBid = await program.provider.connection.getAccountInfo(auctionAccountPda);
    if (auctionInfoBeforeBid) {
      console.log("Auction account balance before second bid (lamports):", auctionInfoBeforeBid.lamports);
    }
    let data = {
        auction: auctionAccountPda,
        bidder: { pubkey: acounts[1].publicKey, isWritable: true, isSigner: true },
        oldBidder: { pubkey: oldBidderKey, isWritable: true, isSigner: false },
        systemProgram: { pubkey: anchor.web3.SystemProgram.programId, isWritable: false, isSigner: false },
    }
    console.log("DATA", data);
    console.log(auctionAccountPda)
    console.log(auctionAccountPda.publicKey)
    const tx = await program.methods
      .bid(bidAmount, newContent)
      .accounts({
        auction: auctionAccountPda,
        bidder: { pubkey: acounts[1].publicKey, isWritable: true, isSigner: true },
        oldBidder: { pubkey: oldBidderKey, isWritable: true, isSigner: false },
        systemProgram: { pubkey: anchor.web3.SystemProgram.programId, isWritable: false, isSigner: false },
      })
      .signers([acounts[1]])
      .rpc();

    console.log("");
    console.log("");
    console.log("STEP 02------------------------------------");
    console.log("Your transaction signature", tx);

    const auction = await program.account.auction.fetch(auctionAccountPda);
    console.log("Auction data after bid:", auction);

  });
  return;
  it("07 - End the auction", async () => {
    const tx = await program.methods
      .endAuction()
      .accounts({
        auction: auctionAccountPda.publicKey,
        authority: { pubkey: program.provider.wallet.publicKey, isWritable: true, isSigner: true }, // authority is a signer for this transaction
        systemProgram: { pubkey: anchor.web3.SystemProgram.programId, isWritable: false, isSigner: false },
      })
      .rpc();

    console.log("");
    console.log("");
    console.log("STEP 03------------------------------------");
    console.log("Your transaction signature", tx);

    const auction = await program.account.auction.fetch(auctionAccountPda);
    console.log("Auction data after end:", auction);

    // Assertions to verify the auction ended correctly
    // For example, check if is_active is false and new_content is empty
    // expect(auction.isActive).to.be.false;
    // expect(auction.newContent).to.equal("");
  });
});