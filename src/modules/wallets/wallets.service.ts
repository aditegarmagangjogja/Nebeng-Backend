import { Injectable, BadRequestException } from '@nestjs/common';
import { WalletsRepository } from './repository/wallets.repository';
import { WalletMapper } from './mappers/wallet.mapper';

@Injectable()
export class WalletsService {
  constructor(private readonly walletRepository: WalletsRepository) {}

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

    await this.walletRepository.processEscrowHold(
      wallet.id,
      orderIdStr,
      amount,
    );
  }

  async releaseEscrow(
    mitraUserIdStr: string,
    orderIdStr: string,
    amount: number,
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

    await this.walletRepository.processEscrowRelease(
      wallet.id,
      orderIdStr,
      amount,
    );
  }
}
