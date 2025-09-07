use anchor_lang::prelude::*;

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
