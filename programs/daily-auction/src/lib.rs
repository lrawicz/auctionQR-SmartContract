use anchor_lang::prelude::*;

pub mod contexts;
pub mod error;
pub mod processor;
pub mod state;

use contexts::*;

declare_id!("BxDvT9XonDvex92E6DebkHHfEQaNra6eKK3FdUcD7qQ6");

#[program]
pub mod daily_auction {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, initial_content: String) -> Result<()> {
        processor::initialize(ctx, initial_content)
    }

    pub fn start_auction(ctx: Context<StartAuction>) -> Result<()> {
        processor::start_auction(ctx)
    }

    pub fn end_auction(ctx: Context<EndAuction>) -> Result<()> {
        processor::end_auction(ctx)
    }

    pub fn bid(ctx: Context<Bid>, amount: u64, new_content: String) -> Result<()> {
        processor::bid(ctx, amount, new_content)
    }
}
