/*
  Warnings:

  - Added the required column `vehicle_id` to the `trips` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `checkpoints_log` DROP FOREIGN KEY `checkpoints_log_scanned_by_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `reward_transactions` DROP FOREIGN KEY `reward_transactions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `verifications` DROP FOREIGN KEY `verifications_user_id_fkey`;

-- DropIndex
DROP INDEX `checkpoints_log_scanned_by_user_id_fkey` ON `checkpoints_log`;

-- DropIndex
DROP INDEX `reward_transactions_user_id_fkey` ON `reward_transactions`;

-- DropIndex
DROP INDEX `verifications_user_id_fkey` ON `verifications`;

-- AlterTable
ALTER TABLE `checkpoints_log` MODIFY `scanned_by_user_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `trips` ADD COLUMN `vehicle_id` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `refresh_token` TEXT NULL,
    MODIFY `status` ENUM('active', 'suspended', 'blocked', 'inactive', 'deleted') NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE `vehicles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `type` ENUM('motor', 'mobil') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `plate_number` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `capacity_seats` INTEGER NOT NULL,
    `max_weight_capacity_kg` DECIMAL(8, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicles_plate_number_key`(`plate_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `verifications` ADD CONSTRAINT `verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkpoints_log` ADD CONSTRAINT `checkpoints_log_scanned_by_user_id_fkey` FOREIGN KEY (`scanned_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reward_transactions` ADD CONSTRAINT `reward_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
