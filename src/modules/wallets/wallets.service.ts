import { Injectable, BadRequestException } from '@nestjs/common';
import { WalletsRepository } from './repository/wallets.repository';
import { WalletMapper } from './mappers/wallet.mapper';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletRepository: WalletsRepository,
    private readonly prisma: PrismaService,
  ) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async getMyWallet(userIdStr: string) {
    let wallet = await this.walletRepository.findByUserId(userIdStr);

    if (!wallet) {
      wallet = await this.walletRepository.createWallets(userIdStr);
    }

    return WalletMapper.toResponse(wallet);
  }

  async holdEscrow(mitraUserIdStr: string, orderIdStr: string, amount: number) {
    let wallet = await this.walletRepository.findByUserId(mitraUserIdStr);

    if (!wallet) {
      wallet = await this.walletRepository.createWallets(mitraUserIdStr);
    }

    return this.walletRepository.processEscrowHold(
      wallet.id,
      orderIdStr,
      amount,
    );
  }

  async releaseEscrow(
    mitraUserIdStr: string,
    orderIdStr: string,
    amount: number,
    platformFee: number = 0,
  ) {
    let wallet = await this.walletRepository.findByUserId(mitraUserIdStr);

    if (!wallet) {
      wallet = await this.walletRepository.createWallets(mitraUserIdStr);
    }

    if (Number(wallet.heldEscrowBalance) < amount) {
      throw new BadRequestException(
        'Saldo Escrow tidak mencukupi untuk dicairkan',
      );
    }

    return this.walletRepository.processEscrowRelease(
      wallet.id,
      orderIdStr,
      amount,
      platformFee,
    );
  }

  async requestWithdrawal(userIdStr: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException(
        'Jumlah penarikan saldo harus lebih besar dari 0',
      );
    }

    const parsedUserId = this.safeParseBigInt(userIdStr);
    if (!parsedUserId) {
      throw new BadRequestException('Format ID User tidak valid');
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: parsedUserId },
    });

    if (!profile || !profile.bankName || !profile.bankAccountNumber) {
      throw new BadRequestException(
        'Informasi rekening bank belum diisi. Silakan lengkapi profil rekening Anda terlebih dahulu.',
      );
    }

    let wallet = await this.walletRepository.findByUserId(userIdStr);
    if (!wallet) {
      wallet = await this.walletRepository.createWallets(userIdStr);
    }

    if (Number(wallet.balance) < amount) {
      throw new BadRequestException(
        'Saldo utama Anda tidak mencukupi untuk melakukan penarikan.',
      );
    }

    const bankDetails = `${profile.bankName} - ${profile.bankAccountNumber} a.n ${profile.bankAccountHolder || profile.fullNameKtp}`;

    const { wallet: updatedWallet } =
      await this.walletRepository.processWithdrawal(
        wallet.id,
        amount,
        bankDetails,
      );

    return {
      message: `Penarikan saldo sebesar Rp ${amount.toLocaleString()} berhasil diproses ke rekening ${bankDetails}.`,
      wallet: WalletMapper.toResponse(updatedWallet),
    };
  }
}
