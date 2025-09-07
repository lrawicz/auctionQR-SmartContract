use anchor_lang::prelude::*;
use crate::state::Auction;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + (4+250)+ (4+250) + 8 + 8 + 32 + 1 + 1,
        seeds = [b"auction".as_ref()],
        bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartAuction<'info> {
    #[account(
        mut,
        seeds = [b"auction".as_ref()],
        bump = auction.bump,
        has_one = authority
    )]
    pub auction: Account<'info, Auction>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EndAuction<'info> {
    #[account(
        mut,
        seeds = [b"auction".as_ref()],
        bump = auction.bump,
        has_one = authority
    )]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Bid<'info> {
    #[account(
        mut,
        seeds = [b"auction".as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    /// CHECK: This is the account of the previous highest bidder. We perform a manual check inside the instruction to ensure it matches the `highest_bidder` stored in the auction account.
    #[account(mut)]
    pub old_bidder: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
