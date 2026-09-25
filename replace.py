import re

path = r'd:\MAGANG\Nebeng\nebeng-backend\src\modules\orders\orders.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r"// a\. Refund Customer.*?description: Pengembalian Dana Escrow \(Order Dibatalkan\) #\$\{order\.id\},\s*},\s*\);\s*\}"
replacement = '''// a. Refund Customer via Xendit API
        const secretKey = process.env.XENDIT_SECRET_KEY || "";
        if (secretKey && !secretKey.includes("dummy")) {
          const basicAuth = Buffer.from(${secretKey}:).toString("base64");
          try {
            await fetch("https://api.xendit.co/refunds", {
              method: "POST",
              headers: { Authorization: Basic , "Content-Type": "application/json" },
              body: JSON.stringify({ amount: totalPrice, reason: "CANCELLATION" }),
            });
          } catch (e) {
            console.error("Gagal memproses refund Xendit otomatis", e);
          }
        }

        // b. Deduct Escrow from Mitra
        const mitraWallet = await tx.wallet.findUnique({
          where: { userId: order.trip.mitraId },
        });
        if (mitraWallet) {
          await tx.wallet.update({
            where: { id: mitraWallet.id },
            data: { heldEscrowBalance: { decrement: netMitraAmount } },
          });
        }'''

new_content = re.sub(target, replacement, content, flags=re.DOTALL)
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
