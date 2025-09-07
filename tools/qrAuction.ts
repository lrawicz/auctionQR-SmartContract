import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DailyAuction } from "../target/types/daily_auction";

export class QrAuction{
    program:Program<DailyAuction>;
    provider: anchor.Provider;
    auctionPda:anchor.web3.PublicKey;
    authority:anchor.Wallet;

    constructor(){
        // Configure the client to use the local cluster.
        this.provider = anchor.AnchorProvider.env();
        anchor.setProvider(this.provider);
        this.program = anchor.workspace.DailyAuction as Program<DailyAuction>;
        
        // Keypairs for the test
        this.authority = this.provider.wallet as anchor.Wallet;
        
        // PDA for the auction account
        [this.auctionPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("auction")],
            this.program.programId
        );

    }
    async initialize(params:{initialContent:string}){
        await this.program.methods
          .initialize(params.initialContent)
          .accounts({
            auction: this.auctionPda,
            authority: this.authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
    }

    async bid(params:{
        bidder:anchor.web3.Keypair, 
        oldBidderPublicKey?:anchor.web3.PublicKey
        bidAmount:number,
        newContent:string
    }) {
        // const bidAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
        // const newContent = "Content from Bidder One";
      try{
        await this.program.methods
        .bid(new anchor.BN(params.bidAmount * anchor.web3.LAMPORTS_PER_SOL), params.newContent)
        .accounts({
            auction: this.auctionPda,
            bidder: params.bidder.publicKey,
            oldBidder: params.oldBidderPublicKey?
              params.oldBidderPublicKey:
              params.bidder.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([params.bidder])
          .rpc();
        }catch(error){
          throw error;
        }
  

    };
    async start_auction(){
        await this.program.methods
        .startAuction()
        .accounts({
            auction: this.auctionPda,
            authority: this.authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
       
    }
    async end_auction(){
        await this.program.methods
        .endAuction()
        .accounts({
            auction: this.auctionPda,
            authority: this.authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

    }
    async getData():Promise<{
      authority: anchor.web3.PublicKey;
      newContent: string;
      oldContent: string;
      endTimestamp: anchor.BN;
      highestBid: anchor.BN;
      highestBidder: anchor.web3.PublicKey;
      isActive: boolean;
      bump: number;
    }>{
      return await this.program.account.auction.fetch(this.auctionPda);
    }
    async getBalance():Promise<number>{
      return await this.provider.connection.getBalance(
          this.auctionPda
        );
    }
}