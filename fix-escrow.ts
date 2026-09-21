const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();

async function fixEscrow() {
  console.log('Mencari wallet dengan saldo escrow minus...');
  
  const wallets = await prisma.wallet.findMany({
    where: {
      heldEscrowBalance: {
        lt: 0
      }
    }
  });

  if (wallets.length === 0) {
    console.log('Tidak ada wallet dengan saldo escrow minus.');
    return;
  }

  console.log(`Ditemukan ${wallets.length} wallet dengan saldo escrow minus.`);

  for (const wallet of wallets) {
    console.log(`Memperbaiki Wallet ID ${wallet.id} (Saldo Escrow: ${wallet.heldEscrowBalance}) -> 0`);
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        heldEscrowBalance: 0
      }
    });
  }

  console.log('Perbaikan selesai!');
}

fixEscrow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
