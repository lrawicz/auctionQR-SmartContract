use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::{invoke, invoke_signed}, // <--- MODIFICADO (añadido invoke_signed para claridad)
    system_instruction,
};
use anchor_lang::system_program; // <--- AÑADE ESTA LÍNEA

declare_id!("BxDvT9XonDvex92E6DebkHHfEQaNra6eKK3FdUcD7qQ6");

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
        auction.bump = ctx.bumps.auction;

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
        // require!(
        //     clock.unix_timestamp >= auction.end_timestamp,
        //     AuctionError::AuctionNotOver
        // );

        // <--- MODIFICADO: Transferencia a la autoridad usando invoke_signed
        if auction.highest_bid > 0 {
            let amount_to_pay = auction.highest_bid;
            let seeds = &[
                b"auction".as_ref(),
                &[auction.bump]
            ];

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
                &[seeds],
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

    // --- Validaciones ---
    require!(auction.is_active, AuctionError::AuctionNotActive);
    require!(amount > auction.highest_bid, AuctionError::BidTooLow);
    require!(new_content.len() <= 250, AuctionError::ContentTooLong);

    // --- Reembolso al postor anterior (con CpiContext) ---
    if auction.highest_bid > 0 {
        require!(
            ctx.accounts.old_bidder.key() == auction.highest_bidder,
            AuctionError::InvalidOldBidderAccount
        );

        let amount_to_return = auction.highest_bid;
        
        // Preparamos las semillas para la firma del PDA
        let seeds = &[
            b"auction".as_ref(),
            &[auction.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Creamos el contexto para la llamada, especificando las cuentas
        let cpi_accounts = system_program::Transfer {
            from: auction.to_account_info(),
            to: ctx.accounts.old_bidder.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // Ejecutamos la transferencia usando el contexto. ¡Mucho más limpio!
        system_program::transfer(cpi_context, amount_to_return)?;
    }

    // --- Depósito de la nueva oferta (con CpiContext) ---
    // Creamos el contexto para la transferencia desde la cuenta del postor
    let cpi_accounts_deposit = system_program::Transfer {
        from: ctx.accounts.bidder.to_account_info(),
        to: auction.to_account_info(),
    };
    let cpi_program_deposit = ctx.accounts.system_program.to_account_info();
    let cpi_context_deposit = CpiContext::new(cpi_program_deposit, cpi_accounts_deposit);

    // Ejecutamos la transferencia
    system_program::transfer(cpi_context_deposit, amount)?;

    // --- Actualización final del estado ---
    auction.highest_bid = amount;
    auction.highest_bidder = ctx.accounts.bidder.key();
    auction.new_content = new_content;

    msg!("Oferta recibida correctamente: {} de {}", amount, ctx.accounts.bidder.key());
    Ok(())
}}

#[account]
pub struct Auction {
    pub authority: Pubkey,
    pub new_content: String,
    pub old_content: String,
    pub end_timestamp: i64,
    pub highest_bid: u64,
    pub highest_bidder: Pubkey,
    pub is_active: bool,
    pub bump: u8, // <--- MODIFICADO: Campo para el bump
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        // <--- MODIFICADO: Espacio aumentado en 1 byte para el bump
        space = 8 + 32 + (4+250)+ (4+250) + 8 + 8 + 32 + 1 + 1,
        // <--- MODIFICADO: Definición de seeds y bump para crear la PDA
        seeds = [b"auction".as_ref()],
        bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageStartAuction<'info> {
    #[account(
        mut,
        // <--- MODIFICADO: Constraints para verificar la PDA
        seeds = [b"auction".as_ref()],
        bump = auction.bump,
        has_one = authority
    )]
    pub auction: Account<'info, Auction>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ManageEndAuction<'info> {
    #[account(
        mut,
        // <--- MODIFICADO: Constraints para verificar la PDA
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
        // <--- MODIFICADO: Constraints para verificar la PDA
        seeds = [b"auction".as_ref()],
        bump = auction.bump
    )]
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
