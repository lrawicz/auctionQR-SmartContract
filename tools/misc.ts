import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DailyAuction } from "../target/types/daily_auction";

export async function getBalance(publikey:anchor.web3.PublicKey){
  const provider = anchor.AnchorProvider.env();
  return await provider.connection.getBalance(publikey);
}
export async function generateAccount(){
  return anchor.web3.Keypair.generate();
}

export async function getAuthority(){
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  return provider.wallet as anchor.Wallet;
}
export async function airDrop(publikey:anchor.web3.PublicKey, amount:number){
  const provider = anchor.AnchorProvider.env();
  return await provider.connection.requestAirdrop(publikey, amount);
}