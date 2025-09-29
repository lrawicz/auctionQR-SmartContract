import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
//import { DailyAuction } from "../target/types/daily_auction";
import { DailyAuction as DailyAuctionDevnet } from "../idls/devnet/types";
import { DailyAuction as DailyAuctionMainnet } from "../idls/mainnet/types";
import * as fs from 'fs';
import * as os from 'os';
import { Client } from 'pg';
import { settings } from "./settings";

interface AuctionData
{
      authority: anchor.web3.PublicKey;
      newContent: string;
      oldContent: string;
      endTimestamp: anchor.BN;
      highestBid: number;
      highestBidder: anchor.web3.PublicKey;
      oldHighestBid: anchor.BN;
      auctionNumber:anchor.BN;
      isActive: boolean;
      bump: number;
  }
export class QrAuction{
    program:Program<DailyAuctionDevnet|DailyAuctionMainnet>;
    provider:anchor.Provider;
    auctionPda:anchor.web3.PublicKey;
    authority:anchor.Wallet;
    programId:anchor.web3.PublicKey;
    constructor(localnet:boolean=false){
//      const  dynamicDalyAuction = anchor.workspace.DailyAuction as Program <Omit<DailyAuction, 'address'> & { address: typeof idl.address }>;
      
      if(localnet){
        this.provider = anchor.AnchorProvider.env()
        anchor.setProvider(this.provider);
        this.program = anchor.workspace.DailyAuction as Program<DailyAuctionDevnet>;
      }else{
        try{
        // Create a provider and set it
        const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl(settings.solana.networkSelected), 'confirmed');
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
        const networkConfig = settings.solana.networks[settings.solana.networkSelected];
        const idlPath = `${process.cwd()}/${networkConfig.idl}`;
        const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

        if (settings.solana.networkSelected === "devnet") {
            this.program = new Program<Omit<DailyAuctionDevnet, 'address'> & { address: typeof idl.address }>(
                idl as DailyAuctionDevnet,
                this.provider,
            );
        } else if (settings.solana.networkSelected === "mainnet-beta") {
            this.program = new Program<Omit<DailyAuctionMainnet, 'address'> & { address: typeof idl.address }>(
                idl as DailyAuctionMainnet,
                this.provider,
            );
        }

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
        const contractData =await this.getData()
        await this.program.methods
        .endAuction()
        .accounts({
            auction: this.auctionPda,
            authority: this.authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

        await this.write_winHistory_inDB(contractData);

    }
    async getData():Promise<AuctionData>{
      try{
        return await this.program.account.auction.fetch(this.auctionPda)
        .then(data => {
          return {
            authority:data.authority,
            newContent:data.newContent,
            oldContent:data.oldContent,
            endTimestamp:data.endTimestamp,
            highestBid:Number(data.highestBid),
            highestBidder:data.highestBidder,
            oldHighestBid:data.oldHighestBid,
            auctionNumber:data.auctionNumber,
            isActive:data.isActive,
            bump:data.bump,
          }
        }) 
        .catch(error => {
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

    getContractAddress(): anchor.web3.PublicKey {
        return this.auctionPda;
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
        this.program = new Program<DailyAuctionDevnet>(this.program.idl, newProvider);
    }

    async setAuctionNumber(newAuctionNumber:number){
      try{
        await this.program.methods
        .setAuctionNumber(new anchor.BN(newAuctionNumber))
        .accounts({
          auction: this.auctionPda,
          authority: this.authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      }catch(error){
        throw error;
      }
    }

    async endAndStartAuction(newContent: string) {
      try{
        const contractData =await this.getData()
        await this.program.methods
        .endAndStartAuction(newContent)
        .accounts({
          auction: this.auctionPda,
          authority: this.authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
        await this.write_winHistory_inDB(contractData);
      }catch(error){
        throw error;
      }
    }
    private async write_winHistory_inDB(acutionData:AuctionData) {
      try{
        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
        const year = yesterday.getFullYear();
        const month = (yesterday.getMonth() + 1).toString().padStart(2, '0');
        const day = yesterday.getDate().toString().padStart(2, '0');
        const room = `bidroom_${year}-${month}-${day}`;

        const client = new Client({
          user: settings.db.user,
          host: settings.db.host,
          database: settings.db.database,
          password: settings.db.password,
          port: settings.db.port,
        });
        try {
          await client.connect();
          const insertQuery = `INSERT INTO auction_win_history(room,amount,url,auction_number) 
                                VALUES($1,$2,$3,$4) 
                                ON CONFLICT (room) 
                                DO UPDATE 
                                SET 
                                amount = EXCLUDED.amount, 
                                url = EXCLUDED.url,
                                auction_number = EXCLUDED.auction_number`;
          await client.query(insertQuery, [room,Number(acutionData.highestBid),acutionData.newContent,Number(acutionData.auctionNumber)]);
          console.log(`Inserted into auction_win_history: room = ${room}`);
        } catch (dbError) {
          console.error("Error inserting into PostgreSQL:", dbError);
        } finally {
          await client.end();
        }
      }catch(error){
      throw error;
    }
    } 

  }