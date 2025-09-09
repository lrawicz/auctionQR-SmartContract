import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DailyAuction } from "../target/types/daily_auction";
import * as fs from 'fs';
import * as os from 'os';
import { networks } from "./interfaces";

export class QrAuction{
    program:Program<DailyAuction>;
    provider:anchor.Provider;
    auctionPda:anchor.web3.PublicKey;
    authority:anchor.Wallet;
    programId:anchor.web3.PublicKey;
    constructor(network:networks="localnet",programId:string|undefined=undefined){
      if(network=="localnet"){
        this.provider = anchor.AnchorProvider.env()
        anchor.setProvider(this.provider);
        this.program = anchor.workspace.DailyAuction as Program<DailyAuction>;
        this.provider = anchor.getProvider()
      }else{
        const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl(network), 'confirmed');
        const home = os.homedir();
        const walletPath = `${home}/.config/solana/id.json`;
        const keypair = anchor.web3.Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(fs.readFileSync(walletPath).toString()))
        );
        const wallet = new anchor.Wallet(keypair);
        this.provider = new anchor.AnchorProvider(
            connection,
            wallet,
            anchor.AnchorProvider.defaultOptions()
        );
      }
      anchor.setProvider(this.provider);

      this.program = anchor.workspace.DailyAuction as Program<DailyAuction>;
      
      this.programId = programId? new anchor.web3.PublicKey(programId):this.program.programId;
      // Keypairs for the test
      this.authority = this.provider.wallet as anchor.Wallet;
      [this.auctionPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("auction")],
          this.programId
      );

    }
    async initialize(params:{initialContent:string}){
        await this.program.methods
          .initialize(params.initialContent)
          .accounts({
            //authority: this.authority.publicKey,
          })
          .rpc();
    }

    async bid(params:{
        bidder:anchor.web3.Keypair, 
        oldBidderPublicKey?:anchor.web3.PublicKey
        bidAmount:number,
        newContent:string
    }) {
      try{
        await this.program.methods
        .bid(new anchor.BN(params.bidAmount * anchor.web3.LAMPORTS_PER_SOL), params.newContent)
        .accounts({
          oldBidder: params.oldBidderPublicKey? params.oldBidderPublicKey: params.bidder.publicKey,
          bidder: params.bidder.publicKey,
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
            // auction: this.auctionPda,
            // authority: this.authority.publicKey,
            // systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
       
    }
    async end_auction(){
        await this.program.methods
        .endAuction()
        .accounts({
            // auction: this.auctionPda,
            // authority: this.authority.publicKey,
            // systemProgram: anchor.web3.SystemProgram.programId,
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
      try{

        return await this.program.account.auction.fetch(this.auctionPda);
      }catch(error){
        throw error;
      }
    }
    async getBalance():Promise<number>{
      return await this.provider.connection.getBalance(
          this.auctionPda
        );
    }
}