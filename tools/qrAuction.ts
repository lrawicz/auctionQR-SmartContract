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
    constructor(network:networks="localnet",idl:any|undefined=undefined){
//      const  dynamicDalyAuction = anchor.workspace.DailyAuction as Program <Omit<DailyAuction, 'address'> & { address: typeof idl.address }>;
      
      if(network=="localnet"){
        this.provider = anchor.AnchorProvider.env()
        anchor.setProvider(this.provider);
        this.program = anchor.workspace.DailyAuction as Program<DailyAuction>;
      }else{
        try{
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
        // this.provider = anchor.AnchorProvider.env()
        this.program = new Program <Omit<DailyAuction, 'address'> & { address: typeof idl.address }>( 
          // this.program = new Program <DailyAuction>(
            idl as DailyAuction, 
            this.provider,
          );
        }catch(error){
          console.log(error)
        } 

      }
      anchor.setProvider(this.provider);
      
      // this.programId = idl? new anchor.web3.PublicKey(idl.address):this.program.programId;
      // Keypairs for the test
      this.authority = this.provider.wallet as anchor.Wallet;
      try{
        [this.auctionPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("auction")],
          this.program.programId
        );
      }catch(error){
        console.log(error)
      }
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
    async start_auction(new_content:string = ""){
        await this.program.methods
        .startAuction(new_content)
        .accounts({
            auction: this.auctionPda,
            authority: this.authority.publicKey,
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
      try{
        return await this.program.account.auction.fetch(this.auctionPda).catch(error => {
          throw error;
        });
      }catch(error){
        throw error;
      }
    }
    async getBalance():Promise<number>{
      return await this.provider.connection.getBalance(
          this.auctionPda
        );
    }

    async setAuthority(newAuthority:string){
        await this.program.methods
        .setAuthority(new anchor.web3.PublicKey(newAuthority))
        .accounts({
            auction: this.auctionPda,
            authority: this.authority.publicKey,
        })
        .rpc();
    }

    public setWalletAuthority(newAuthorityWallet: anchor.Wallet) {
        this.authority = newAuthorityWallet;
        const newProvider = new anchor.AnchorProvider(
            this.provider.connection,
            newAuthorityWallet,
            anchor.AnchorProvider.defaultOptions()
        );
        anchor.setProvider(newProvider);
        this.provider = newProvider;
        this.program = new Program<DailyAuction>(this.program.idl, newProvider);
    }

    async endAndStartAuction(newContent: string) {
        await this.program.methods
            .endAndStartAuction(newContent)
            .accounts({
                auction: this.auctionPda,
                authority: this.authority.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
    }
}