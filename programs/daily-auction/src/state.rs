use anchor_lang::prelude::*;

#[account]
pub struct Auction {
    pub authority: Pubkey,
    pub new_content: String,
    pub old_content: String,
    pub end_timestamp: i64,
    pub highest_bid: u64,
    pub highest_bidder: Pubkey,
    pub is_active: bool,
    pub bump: u8,
}
