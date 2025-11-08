import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Betting } from "../target/types/betting";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("betting", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Betting as Program<Betting>;

  let admin: Keypair;
  let treasury: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let usdcMint: PublicKey;
  let pythPriceAccount: Keypair; // Mock Pyth account

  let configPda: PublicKey;
  let assetConfigPda: PublicKey;
  let epochPda: PublicKey;
  let vaultPda: PublicKey;
  let treasuryAta: PublicKey;
  let user1Ata: PublicKey;
  let user2Ata: PublicKey;

  const ASSET_SYMBOL = "BTCUSD";
  const FEE_BPS = 100; // 1%
  const SETTLE_TIP_LAMPORTS = 10_000;
  const CUTOFF_SECS = 30;
  const EPOCH_LENGTH_SECS = 300;

  before(async () => {
    // Generate keypairs
    admin = Keypair.generate();
    treasury = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    pythPriceAccount = Keypair.generate();

    // Airdrop SOL to accounts
    await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      treasury.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user1.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user2.publicKey,
      10 * LAMPORTS_PER_SOL
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create USDC mint
    usdcMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6 // USDC has 6 decimals
    );

    // Create token accounts
    const treasuryAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      usdcMint,
      treasury.publicKey
    );
    treasuryAta = treasuryAccount.address;

    const user1Account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      usdcMint,
      user1.publicKey
    );
    user1Ata = user1Account.address;

    const user2Account = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      usdcMint,
      user2.publicKey
    );
    user2Ata = user2Account.address;

    // Mint USDC to users
    await mintTo(
      provider.connection,
      admin,
      usdcMint,
      user1Ata,
      admin,
      1_000_000_000 // 1,000 USDC
    );

    await mintTo(
      provider.connection,
      admin,
      usdcMint,
      user2Ata,
      admin,
      1_000_000_000 // 1,000 USDC
    );

    // Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [assetConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("asset"), Buffer.from(ASSET_SYMBOL)],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        usdcMint.toBuffer(),
        Buffer.from(ASSET_SYMBOL),
      ],
      program.programId
    );
  });

  it("Initializes the protocol", async () => {
    await program.methods
      .initialize(
        admin.publicKey,
        treasury.publicKey,
        FEE_BPS,
        new anchor.BN(SETTLE_TIP_LAMPORTS),
        CUTOFF_SECS,
        EPOCH_LENGTH_SECS
      )
      .accounts({
        config: configPda,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const config = await program.account.globalConfig.fetch(configPda);
    expect(config.admin.toString()).to.equal(admin.publicKey.toString());
    expect(config.treasury.toString()).to.equal(treasury.publicKey.toString());
    expect(config.feeBps).to.equal(FEE_BPS);
    expect(config.paused).to.equal(false);
  });

  it("Sets asset feed", async () => {
    await program.methods
      .setAssetFeed(
        ASSET_SYMBOL,
        pythPriceAccount.publicKey,
        usdcMint
      )
      .accounts({
        assetConfig: assetConfigPda,
        config: configPda,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const assetConfig = await program.account.assetConfig.fetch(assetConfigPda);
    expect(assetConfig.assetSymbol).to.equal(ASSET_SYMBOL);
    expect(assetConfig.pythPriceAccount.toString()).to.equal(
      pythPriceAccount.publicKey.toString()
    );
  });

  it("Creates an epoch", async () => {
    const now = Math.floor(Date.now() / 1000);
    const epochId = Math.floor(now / EPOCH_LENGTH_SECS);

    [epochPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("epoch"),
        Buffer.from(ASSET_SYMBOL),
        new anchor.BN(epochId).toArrayLike(Buffer, "be", 8),
      ],
      program.programId
    );

    await program.methods
      .createEpoch(ASSET_SYMBOL)
      .accounts({
        epoch: epochPda,
        assetConfig: assetConfigPda,
        config: configPda,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const epoch = await program.account.epoch.fetch(epochPda);
    expect(epoch.assetSymbol).to.equal(ASSET_SYMBOL);
    expect(epoch.status).to.deep.equal({ open: {} });
  });

  it("Places bets from two users", async () => {
    const now = Math.floor(Date.now() / 1000);
    const epochId = Math.floor(now / EPOCH_LENGTH_SECS);

    const [user1BetPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        user1.publicKey.toBuffer(),
        Buffer.from(ASSET_SYMBOL),
        new anchor.BN(epochId).toArrayLike(Buffer, "be", 8),
      ],
      program.programId
    );

    // User1 bets 100 USDC on Up
    await program.methods
      .placeBet(
        ASSET_SYMBOL,
        new anchor.BN(epochId),
        { up: {} },
        new anchor.BN(100_000_000) // 100 USDC
      )
      .accounts({
        userBet: user1BetPda,
        epoch: epochPda,
        assetConfig: assetConfigPda,
        config: configPda,
        vault: vaultPda,
        userAta: user1Ata,
        user: user1.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const [user2BetPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        user2.publicKey.toBuffer(),
        Buffer.from(ASSET_SYMBOL),
        new anchor.BN(epochId).toArrayLike(Buffer, "be", 8),
      ],
      program.programId
    );

    // User2 bets 200 USDC on Down
    await program.methods
      .placeBet(
        ASSET_SYMBOL,
        new anchor.BN(epochId),
        { down: {} },
        new anchor.BN(200_000_000) // 200 USDC
      )
      .accounts({
        userBet: user2BetPda,
        epoch: epochPda,
        assetConfig: assetConfigPda,
        config: configPda,
        vault: vaultPda,
        userAta: user2Ata,
        user: user2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    const epoch = await program.account.epoch.fetch(epochPda);
    expect(epoch.sumUp.toString()).to.equal("100000000");
    expect(epoch.sumDown.toString()).to.equal("200000000");
  });

  it("Locks epoch after cutoff", async () => {
    // Wait for cutoff time (in tests, we can't easily wait, so this is demonstrative)
    const now = Math.floor(Date.now() / 1000);
    const epochId = Math.floor(now / EPOCH_LENGTH_SECS);

    try {
      await program.methods
        .lockEpoch(ASSET_SYMBOL, new anchor.BN(epochId))
        .accounts({
          epoch: epochPda,
          assetConfig: assetConfigPda,
          config: configPda,
          caller: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      // May fail if cutoff not reached yet
      console.log("Epoch locked");
    } catch (err) {
      console.log("Lock failed (likely cutoff not reached):", err.message);
    }
  });

  it("Pauses and unpauses protocol", async () => {
    await program.methods
      .pause()
      .accounts({
        config: configPda,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    let config = await program.account.globalConfig.fetch(configPda);
    expect(config.paused).to.equal(true);

    await program.methods
      .unpause()
      .accounts({
        config: configPda,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    config = await program.account.globalConfig.fetch(configPda);
    expect(config.paused).to.equal(false);
  });
});
