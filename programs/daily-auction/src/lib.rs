use anchor_lang::prelude::*;

pub mod contexts;
pub mod error;
pub mod processor;
pub mod state;
pub mod event;

use contexts::*;

declare_id!("7o6VPgbp3FwH368f6vrbHVgKyuDBfdxFhTpqqAc5cwGR");

#[program]
pub mod daily_auction {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, initial_content: String) -> Result<()> {
        processor::initialize(ctx, initial_content)
    }

    pub fn start_auction(ctx: Context<StartAuction>,new_content:String) -> Result<()> {
        processor::start_auction(ctx,new_content)
    }

    pub fn end_auction(ctx: Context<EndAuction>) -> Result<()> {
        processor::end_auction(ctx)
    }

    pub fn bid(ctx: Context<Bid>, amount: u64, new_content: String) -> Result<()> {
        processor::bid(ctx, amount, new_content)
    }

    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        processor::set_authority(ctx, new_authority)
    }

    pub fn end_and_start_auction(ctx: Context<EndAndStartAuction>, new_content: String) -> Result<()> {
        processor::end_and_start_auction(ctx, new_content)
    }

    pub fn set_auction_number(ctx: Context<SetAuctionNumber>, auction_number: u64) -> Result<()> {
        processor::set_auction_number(ctx, auction_number)
    }

}
