use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self, program::invoke_signed, system_instruction};
use anchor_lang::system_program;

use crate::{
    contexts::{Bid, EndAuction, Initialize, StartAuction},
    error::AuctionError,
};

pub fn initialize(ctx: Context<Initialize>, initial_content: String) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    auction.authority = *ctx.accounts.authority.key;
    auction.old_content = initial_content.clone();
    auction.new_content = initial_content;

    let clock = Clock::get()?;
    auction.end_timestamp = clock.unix_timestamp + (24 * 60 * 60); // 24 horas
    auction.is_active = true;
    auction.highest_bid = 0;
    auction.highest_bidder = Pubkey::default();
    auction.bump = ctx.bumps.auction;

    Ok(())
}

pub fn start_auction(ctx: Context<StartAuction>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require!(!auction.is_active, AuctionError::AuctionAlreadyActive);

    let clock = Clock::get()?;
    auction.end_timestamp = clock.unix_timestamp + (24 * 60 * 60); // 24 horas
    auction.is_active = true;
    auction.highest_bid = 0;
    auction.highest_bidder = Pubkey::default();

    msg!("Nueva subasta iniciada. Finaliza en 24 horas.");
    Ok(())
}

pub fn end_auction(ctx: Context<EndAuction>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;

    require!(auction.is_active, AuctionError::AuctionNotActive);

    if auction.highest_bid > 0 {
        let amount_to_pay = auction.highest_bid;
        let seeds = &[b"auction".as_ref(), &[auction.bump]];

        let transfer_to_authority_ix = system_instruction::transfer(
            &auction.key(),
            &ctx.accounts.authority.key(),
            amount_to_pay,
        );

        invoke_signed(
            &transfer_to_authority_ix,
            &[
                auction.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&seeds[..]],
        )?;
    }

    auction.is_active = false;
    auction.old_content = auction.new_content.clone();
    auction.new_content = String::new();
    msg!("Subasta finalizada. Ganador: {}", auction.highest_bidder);
    Ok(())
}

pub fn bid(ctx: Context<Bid>, amount: u64, new_content: String) -> Result<()> {
    let auction = &mut ctx.accounts.auction;

    require!(auction.is_active, AuctionError::AuctionNotActive);
    require!(amount > auction.highest_bid, AuctionError::BidTooLow);
    require!(new_content.len() <= 250, AuctionError::ContentTooLong);

    if auction.highest_bid > 0 {
        require!(
            ctx.accounts.old_bidder.key() == auction.highest_bidder,
            AuctionError::InvalidOldBidderAccount
        );

        let amount_to_return = auction.highest_bid;

        let seeds = &[b"auction".as_ref(), &[auction.bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = system_program::Transfer {
            from: auction.to_account_info(),
            to: ctx.accounts.old_bidder.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        system_program::transfer(cpi_context, amount_to_return)?;
    }

    let cpi_accounts_deposit = system_program::Transfer {
        from: ctx.accounts.bidder.to_account_info(),
        to: auction.to_account_info(),
    };
    let cpi_program_deposit = ctx.accounts.system_program.to_account_info();
    let cpi_context_deposit = CpiContext::new(cpi_program_deposit, cpi_accounts_deposit);

    system_program::transfer(cpi_context_deposit, amount)?;

    auction.highest_bid = amount;
    auction.highest_bidder = ctx.accounts.bidder.key();
    auction.new_content = new_content;

    msg!(
        "Oferta recibida correctamente: {} de {}",
        amount,
        ctx.accounts.bidder.key()
    );
    Ok(())
}
