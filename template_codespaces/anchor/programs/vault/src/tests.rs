#[cfg(test)]
mod tests {
    use crate::{ID as PROGRAM_ID, UserProfile};
    use anchor_lang::AccountDeserialize;
    use litesvm::LiteSVM;
    use solana_sdk::{
        hash::hash,
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_program,
        transaction::Transaction,
    };
    use spl_token::ID as TOKEN_PROGRAM_ID;
    use spl_associated_token_account::ID as ASSOCIATED_TOKEN_PROGRAM_ID;
    use spl_associated_token_account::get_associated_token_address;

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    fn get_vault_pda(signer: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"vault", signer.as_ref()], &PROGRAM_ID)
    }

    fn get_user_profile_pda(signer: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"user", signer.as_ref()], &PROGRAM_ID)
    }

    fn get_mint_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"mint"], &PROGRAM_ID)
    }

    fn discriminator(name: &str) -> [u8; 8] {
        let hash = hash(format!("global:{}", name).as_bytes());
        let mut value = [0u8; 8];
        value.copy_from_slice(&hash.as_ref()[..8]);
        value
    }

    fn create_initialize_user_ix(signer: &Pubkey, profile: &Pubkey) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*profile, false),
                AccountMeta::new(*signer, true),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator("initialize_user").to_vec(),
        }
    }

    fn create_initialize_mint_ix(signer: &Pubkey, mint: &Pubkey) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*mint, false),
                AccountMeta::new(*signer, true),
                AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
                AccountMeta::new_readonly(system_program::ID, false),
                AccountMeta::new_readonly(solana_sdk::sysvar::rent::ID, false),
            ],
            data: discriminator("initialize_mint").to_vec(),
        }
    }

    fn create_record_drop_ix(
        signer: &Pubkey,
        profile: &Pubkey,
        mint: &Pubkey,
        token_account: &Pubkey,
        weight: u64,
        multiplier: u64,
    ) -> Instruction {
        let mut data = discriminator("record_drop").to_vec();
        data.extend_from_slice(&weight.to_le_bytes());
        data.extend_from_slice(&multiplier.to_le_bytes());

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*profile, false),          // user_profile
                AccountMeta::new(*mint, false),             // mint
                AccountMeta::new(*token_account, false),    // token_account
                AccountMeta::new(*signer, true),            // authority
                AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
                AccountMeta::new_readonly(ASSOCIATED_TOKEN_PROGRAM_ID, false),
                AccountMeta::new_readonly(system_program::ID, false),
                AccountMeta::new_readonly(solana_sdk::sysvar::rent::ID, false),
            ],
            data,
        }
    }

    // existing helpers for deposit and withdraw
    fn create_deposit_ix(signer: &Pubkey, vault: &Pubkey, amount: u64) -> Instruction {
        let discriminator: [u8; 8] = [242, 35, 198, 137, 82, 225, 242, 182];
        let mut data = discriminator.to_vec();
        data.extend_from_slice(&amount.to_le_bytes());

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*signer, true),
                AccountMeta::new(*vault, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data,
        }
    }

    fn create_withdraw_ix(signer: &Pubkey, vault: &Pubkey) -> Instruction {
        let discriminator: [u8; 8] = [183, 18, 70, 156, 148, 109, 161, 34];

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*signer, true),
                AccountMeta::new(*vault, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator.to_vec(),
        }
    }

    #[test]
    fn test_profile_initialize_and_record_drop() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        svm.add_program(PROGRAM_ID, program_bytes);
        svm.add_program(TOKEN_PROGRAM_ID, spl_token::ID.as_ref());
        svm.add_program(ASSOCIATED_TOKEN_PROGRAM_ID, spl_associated_token_account::ID.as_ref());

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (profile_pda, _pda_bump) = get_user_profile_pda(&user.pubkey());
        let (mint_pda, _mint_bump) = get_mint_pda();

        // Initialize mint
        let init_mint_ix = create_initialize_mint_ix(&user.pubkey(), &mint_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[init_mint_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Initialize user
        let init_user_ix = create_initialize_user_ix(&user.pubkey(), &profile_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[init_user_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Record drop
        let token_account = get_associated_token_address(&user.pubkey(), &mint_pda);
        let record_ix = create_record_drop_ix(&user.pubkey(), &profile_pda, &mint_pda, &token_account, 5, 10);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[record_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let account = svm.get_account(&profile_pda).expect("user profile account created");
        let mut data_slice = account.data.as_slice();
        let profile = UserProfile::try_deserialize(&mut data_slice).unwrap();
        assert_eq!(profile.points, 50);
        assert_eq!(profile.authority, user.pubkey());

        // Verify token balance
        let token_data = svm.get_account(&token_account).unwrap().data;
        let token_balance = u64::from_le_bytes(token_data[64..72].try_into().unwrap());
        assert_eq!(token_balance, 50);
    }

    #[test]
    fn test_deposit_and_withdraw() {
        let mut svm = LiteSVM::new();

        // Load the program
        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        // Create a user with some SOL
        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        // Get vault PDA
        let (vault_pda, _bump) = get_vault_pda(&user.pubkey());

        // Deposit 1 SOL
        let deposit_amount = LAMPORTS_PER_SOL;
        let deposit_ix = create_deposit_ix(&user.pubkey(), &vault_pda, deposit_amount);

        let blockhash = svm.latest_blockhash();
        let deposit_tx = Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );

        let result = svm.send_transaction(deposit_tx);
        assert!(result.is_ok(), "Deposit should succeed");

        // Check vault balance
        let vault_account = svm.get_account(&vault_pda).unwrap();
        assert_eq!(vault_account.lamports, deposit_amount);

        // Withdraw
        let withdraw_ix = create_withdraw_ix(&user.pubkey(), &vault_pda);

        let blockhash = svm.latest_blockhash();
        let withdraw_tx = Transaction::new_signed_with_payer(
            &[withdraw_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );

        let result = svm.send_transaction(withdraw_tx);
        assert!(result.is_ok(), "Withdraw should succeed");

        // Check vault is empty (account may not exist or have 0 lamports)
        let vault_account = svm.get_account(&vault_pda);
        assert!(
            vault_account.is_none() || vault_account.unwrap().lamports == 0,
            "Vault should be empty after withdraw"
        );
    }

    #[test]
    fn test_deposit_fails_if_vault_has_funds() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (vault_pda, _bump) = get_vault_pda(&user.pubkey());

        // First deposit
        let deposit_ix = create_deposit_ix(&user.pubkey(), &vault_pda, LAMPORTS_PER_SOL);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Second deposit should fail
        let deposit_ix2 = create_deposit_ix(&user.pubkey(), &vault_pda, LAMPORTS_PER_SOL);
        let blockhash = svm.latest_blockhash();
        let tx2 = Transaction::new_signed_with_payer(
            &[deposit_ix2],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );

        let result = svm.send_transaction(tx2);
        assert!(result.is_err(), "Second deposit should fail");
    }

    #[test]
    fn test_withdraw_fails_if_vault_empty() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (vault_pda, _bump) = get_vault_pda(&user.pubkey());

        // Try to withdraw from empty vault
        let withdraw_ix = create_withdraw_ix(&user.pubkey(), &vault_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[withdraw_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );

        let result = svm.send_transaction(tx);
        assert!(result.is_err(), "Withdraw from empty vault should fail");
    }
}
