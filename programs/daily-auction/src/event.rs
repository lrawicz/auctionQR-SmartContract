use anchor_lang::prelude::*;

#[event]
pub struct BidPlaced {
    pub bidder: Pubkey,
    pub old_bidder: Pubkey,
    pub amount: u64,
    pub new_content: String,
}