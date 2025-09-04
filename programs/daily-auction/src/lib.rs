use anchor_lang::prelude::*;
// use solana_system_interface::instruction as system_instruction;
use anchor_lang::solana_program::{program::invoke, system_instruction};

declare_id!("BxDvT9XonDvex92E6DebkHHfEQaNra6eKK3FdUcD7qQ6"); // Reemplazar con el ID de tu programa

#[program]
pub mod daily_auction {
    use super::*;
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
        Ok(())
    }
    pub fn start_auction(ctx: Context<ManageStartAuction>) -> Result<()> {
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
    pub fn end_auction(ctx: Context<ManageEndAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(auction.is_active, AuctionError::AuctionNotActive);
        //testing
        // require!(
        //     clock.unix_timestamp >= auction.end_timestamp,
        //     AuctionError::AuctionNotOver
        // );

        // Pagar a la autoridad desde la cuenta de la subasta.
        if auction.highest_bid > 0 {
            **auction.to_account_info().try_borrow_mut_lamports()? -= auction.highest_bid;
            **ctx.accounts.authority.try_borrow_mut_lamports()? += auction.highest_bid;
        }

        auction.is_active = false;
        auction.old_content = auction.new_content.clone();
        auction.new_content = String::new();
        msg!("Subasta finalizada. Ganador: {}", auction.highest_bidder);
        Ok(())
    }
    pub fn bid(ctx: Context<Bid>, amount: u64, new_content: String) -> Result<()> {
        let clock = Clock::get()?;
        let bidder = &ctx.accounts.bidder;
        let old_bidder = &ctx.accounts.old_bidder;
        let auction = &mut ctx.accounts.auction;

        require!(new_content.len() <= 250, AuctionError::ContentTooLong);
        require!(auction.is_active, AuctionError::AuctionNotActive);
        //testing
        // require!(
        //     clock.unix_timestamp < auction.end_timestamp,
        //     AuctionError::AuctionEnded
        // );
        require!(amount > auction.highest_bid, AuctionError::BidTooLow);

        // Si hay un postor anterior, devolverle su oferta.
        if auction.highest_bidder != Pubkey::default() {
            require!(
                ctx.accounts.old_bidder.key() == auction.highest_bidder,
                AuctionError::InvalidOldBidderAccount
            );

            let previous_bidder_account_info = ctx.accounts.old_bidder.to_account_info();

            let amount_to_return = auction.highest_bid;

            **auction.to_account_info().try_borrow_mut_lamports()? -= amount_to_return;
            **previous_bidder_account_info.try_borrow_mut_lamports()? += amount_to_return;
        }

        // Transferir la nueva oferta a la cuenta de la subasta.
        let transfer_instruction =
            system_instruction::transfer(bidder.to_account_info().key, &auction.key(), amount);
        invoke(
            &transfer_instruction,
            &[
                bidder.to_account_info(),
                auction.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Actualizar el estado de la subasta.
        auction.highest_bid = amount;
        auction.highest_bidder = *bidder.key;
        auction.new_content = new_content;

        msg!(
            "Nueva oferta recibida: {} lamports de {}",
            amount,
            bidder.key()
        );
        Ok(())
    }

}

#[account]
pub struct Auction {
    pub authority: Pubkey,      // La cuenta que recibe los fondos de la subasta.
    pub new_content: String,    // El string que se está subastando.
    pub old_content: String,    // El string anterior que se subastó.
    pub end_timestamp: i64,     // Momento en que finaliza la subasta (en formato Unix timestamp).
    pub highest_bid: u64,       // La puja más alta actual (en lamports).
    pub highest_bidder: Pubkey, // La clave pública del mejor postor.
    pub is_active: bool,        // Un booleano para saber si la subasta está en curso.
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    // Espacio para los strings y otros datos
    #[account(init, payer = authority, space = 8 + 32 + (4+250)+ (4+250) + 8 + 8 + 32 + 1)]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageStartAuction<'info> {
    #[account(mut, has_one = authority)]
    pub auction: Account<'info, Auction>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ManageEndAuction<'info> {
    #[account(mut, has_one = authority)]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct Bid<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    /// CHECK: This account is checked against `auction.highest_bidder` in the instruction.
    #[account(mut)]
    pub old_bidder: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum AuctionError {
    AuctionAlreadyActive,
    AuctionNotActive,
    AuctionEnded,
    BidTooLow,
    AuctionNotOver,
    NotTheWinner,
    AuctionIsActive,
    MissingBidderAccount,
    InvalidOldBidderAccount,
    ContentTooLong,
}
