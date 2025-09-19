use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::{
    contexts::{Bid, EndAuction, Initialize, StartAuction, SetAuthority, EndAndStartAuction}, 
    error::AuctionError, 
    event::BidPlaced, event::AuctionEnded
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

pub fn start_auction(ctx: Context<StartAuction>, new_content:String) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require!(!auction.is_active, AuctionError::AuctionAlreadyActive);

    let clock = Clock::get()?;
    auction.end_timestamp = clock.unix_timestamp + (24 * 60 * 60); // 24 horas
    auction.is_active = true;
    auction.highest_bid = 0;
    auction.new_content = new_content;
    auction.highest_bidder = Pubkey::default();

    msg!("Nueva subasta iniciada. Finaliza en 24 horas.");
    Ok(())
}

pub fn end_auction(ctx: Context<EndAuction>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;

    require!(auction.is_active, AuctionError::AuctionNotActive);
    //require!(auction.end_timestamp < Clock::get()?.unix_timestamp, AuctionError::AuctionNotOver); 

    if auction.highest_bid > 0 {
        let amount_to_pay = auction.highest_bid;

        // Natively transfer lamports from the PDA to the authority
        **auction.to_account_info().try_borrow_mut_lamports()? -= amount_to_pay;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount_to_pay;
    }
    emit!(AuctionEnded {
        winner: auction.highest_bidder.clone(),
        amount: auction.highest_bid.clone(),
        content: auction.new_content.clone(),
    });
    
    msg!("Aucition ended: {}${}${}", 
        auction.highest_bid.clone(), 
        auction.new_content.clone(),
        auction.highest_bidder.clone()
    );

    auction.is_active = false;
    auction.old_content = auction.new_content.clone();
    auction.new_content = String::new();
    auction.highest_bid = 0;
    auction.highest_bidder = Pubkey::default();

    Ok(())
}

pub fn bid(ctx: Context<Bid>, amount: u64, new_content: String) -> Result<()> {
    let auction = &mut ctx.accounts.auction;

    // --- Validations ---
    require!(auction.is_active, AuctionError::AuctionNotActive);
    require!(amount > auction.highest_bid, AuctionError::BidTooLow);
    require!(new_content.len() <= 250, AuctionError::ContentTooLong);
    
    //require!(auction.end_timestamp > Clock::get()?.unix_timestamp, AuctionError::AuctionEnded);

    let previous_bid = auction.highest_bid;

    // --- Deposit the new bid (CPI from bidder to PDA) ---
    let cpi_accounts_deposit = system_program::Transfer {
        from: ctx.accounts.bidder.to_account_info(),
        to: auction.to_account_info(),
    };
    let cpi_program_deposit = ctx.accounts.system_program.to_account_info();
    let cpi_context_deposit = CpiContext::new(cpi_program_deposit, cpi_accounts_deposit);
    system_program::transfer(cpi_context_deposit, amount)?;

    // --- Refund previous bidder (if any) ---
    if previous_bid > 0 {
        require!(
            ctx.accounts.old_bidder.key() == auction.highest_bidder,
            AuctionError::InvalidOldBidderAccount
        );
        
        // Natively transfer lamports from the PDA
        **auction.to_account_info().try_borrow_mut_lamports()? -= previous_bid;
        **ctx.accounts.old_bidder.to_account_info().try_borrow_mut_lamports()? += previous_bid;
    }


    msg!("newBid->amount: {}", amount.clone());
    msg!("newBid->newContent: {}",new_content.clone());
    msg!("newBid->address: {}", ctx.accounts.bidder.key().clone());
    msg!("newBid->timestamp: {}", Clock::get()?.unix_timestamp );

    emit!(BidPlaced {
        bidder: ctx.accounts.bidder.key().clone(),
        old_bidder: ctx.accounts.old_bidder.key().clone(),
        amount,
        new_content: auction.new_content.clone(),
    });
    
    // --- Update auction state ---
    auction.highest_bid = amount;
    auction.highest_bidder = ctx.accounts.bidder.key();
    auction.new_content = new_content;

    Ok(())
}

pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
    ctx.accounts.auction.authority = new_authority;
    Ok(())
}

pub fn end_and_start_auction(ctx: Context<EndAndStartAuction>, new_content: String) -> Result<()> {
    let auction = &mut ctx.accounts.auction;

    // --- End Auction Logic ---
    require!(auction.is_active, AuctionError::AuctionNotActive);

    if auction.highest_bid > 0 {
        let amount_to_pay = auction.highest_bid;

        // Natively transfer lamports from the PDA to the authority
        **auction.to_account_info().try_borrow_mut_lamports()? -= amount_to_pay;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount_to_pay;
    }
    emit!(AuctionEnded {
        winner: auction.highest_bidder.clone(),
        amount: auction.highest_bid.clone(),
        content: auction.new_content.clone(),
    });
    
    msg!("Auction ended: {}${}${}", 
        auction.highest_bid.clone(), 
        auction.new_content.clone(),
        auction.highest_bidder.clone()
    );

    auction.is_active = false;
    auction.old_content = auction.new_content.clone();
    auction.new_content = String::new();
    auction.highest_bid = 0;
    auction.highest_bidder = Pubkey::default();

    // --- Start New Auction Logic ---
    let clock = Clock::get()?;
    auction.end_timestamp = clock.unix_timestamp + (24 * 60 * 60); // 24 horas
    auction.is_active = true;
    auction.highest_bid = 0;
    auction.new_content = new_content;
    auction.highest_bidder = Pubkey::default();

    msg!("New auction started. Ends in 24 hours.");
    Ok(())
}
