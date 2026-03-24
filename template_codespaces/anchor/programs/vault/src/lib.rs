use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{self, Mint, TokenAccount, MintTo};

#[cfg(test)]
mod tests;

declare_id!("3Q7SQubHBDNhgdYZPvD1RtDCymvWdbmkVwVRp2zApAzz");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        profile.authority = *ctx.accounts.signer.key;
        profile.points = 0;
        profile.bump = ctx.bumps.user_profile;
        Ok(())
    }

    pub fn initialize_mint(_ctx: Context<InitializeMint>) -> Result<()> {
        // The mint is already initialized by the init constraint
        // with the specified decimals and authority
        Ok(())
    }

    pub fn record_drop(
        ctx: Context<RecordDrop>,
        weight: u64,
        award_multiplier: u64,
    ) -> Result<()> {
        require!(weight > 0, VaultError::InvalidAmount);
        require!(award_multiplier > 0, VaultError::InvalidAmount);

        let points = weight
            .checked_mul(award_multiplier)
            .ok_or(VaultError::CalculationOverflow)?;

        let profile = &mut ctx.accounts.user_profile;
        profile.points = profile
            .points
            .checked_add(points)
            .ok_or(VaultError::CalculationOverflow)?;

        // Mint tokens to user's ATA
        let amount = points; // 1 token per point
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn deposit(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
        require!(ctx.accounts.vault.lamports() == 0, VaultError::VaultAlreadyExists);

        let rent = Rent::get()?.minimum_balance(0);
        require!(amount > rent, VaultError::InvalidAmount);

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.signer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<VaultAction>) -> Result<()> {
        require!(ctx.accounts.vault.lamports() > 0, VaultError::InvalidAmount);

        let bump = ctx.bumps.vault;
        let signer_key = ctx.accounts.signer.key();
        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", signer_key.as_ref(), &[bump]]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.signer.to_account_info(),
                },
                signer_seeds,
            ),
            ctx.accounts.vault.lamports(),
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 8 + 1,
        seeds = [b"user", signer.key().as_ref()],
        bump,
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
        seeds = [b"mint"],
        bump,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, token::Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RecordDrop<'info> {
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(
        mut,
        seeds = [b"mint"],
        bump,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct VaultAction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub points: u64,
    pub bump: u8,
}

#[error_code]
pub enum VaultError {
    #[msg("Vault already exists")]
    VaultAlreadyExists,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Calculation overflow")]
    CalculationOverflow,
    #[msg("User profile already exists")]
    UserProfileAlreadyExists,
    #[msg("User profile not found")]
    UserProfileNotFound,
}
