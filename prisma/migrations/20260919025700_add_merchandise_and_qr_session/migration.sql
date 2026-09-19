/*
  Warnings:

  - The values [superadmin,admin_wilayah,operator_pos] on the enum `users_role` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[trip_id,customer_id]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[service_type,size]` on the table `pricing_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `order_qr_sessions` ADD COLUMN `scan_phase` ENUM('checkin_origin', 'checkin_destination') NULL,
    ADD COLUMN `used_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `admin_fee_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 10.00;

-- AlterTable
ALTER TABLE `pricing_settings` ADD COLUMN `max_weight_kg` DECIMAL(8, 2) NULL,
    ADD COLUMN `size` ENUM('xxs', 'xs', 's', 'm', 'l', 'xl') NULL;

-- AlterTable
ALTER TABLE `regions` ADD COLUMN `boundary_polygon` LONGTEXT NULL,
    ADD COLUMN `latitude` DECIMAL(10, 8) NULL,
    ADD COLUMN `longitude` DECIMAL(11, 8) NULL,
    ADD COLUMN `radius_km` DECIMAL(8, 2) NULL DEFAULT 20.00;

-- AlterTable
ALTER TABLE `trips` ADD COLUMN `service_type` ENUM('motor', 'mobil', 'barang') NOT NULL DEFAULT 'mobil';

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('admin', 'regional', 'operator', 'mitra', 'customer') NOT NULL;

-- CreateTable
CREATE TABLE `merchandise_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `points_required` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `image_url` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchandise_redemptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `merchandise_id` BIGINT NOT NULL,
    `points_spent` INTEGER NOT NULL,
    `recipient_name` VARCHAR(191) NOT NULL,
    `recipient_phone` VARCHAR(191) NOT NULL,
    `shipping_address` TEXT NULL,
    `pickup_pos_id` BIGINT NULL,
    `status` ENUM('pending', 'processing', 'ready_at_pos', 'completed', 'cancelled', 'rejected') NOT NULL DEFAULT 'pending',
    `tracking_number` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `merchandise_redemptions_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `conversations_trip_id_customer_id_key` ON `conversations`(`trip_id`, `customer_id`);

-- CreateIndex
CREATE INDEX `order_qr_sessions_order_id_qr_token_idx` ON `order_qr_sessions`(`order_id`, `qr_token`);

-- CreateIndex
CREATE INDEX `orders_status_escrow_status_idx` ON `orders`(`status`, `escrow_status`);

-- CreateIndex
CREATE UNIQUE INDEX `pricing_settings_service_type_size_key` ON `pricing_settings`(`service_type`, `size`);

-- CreateIndex
CREATE INDEX `trips_departure_date_status_idx` ON `trips`(`departure_date`, `status`);

-- CreateIndex
CREATE INDEX `trips_origin_point_id_destination_point_id_idx` ON `trips`(`origin_point_id`, `destination_point_id`);

-- CreateIndex
CREATE INDEX `users_role_idx` ON `users`(`role`);

-- CreateIndex
CREATE INDEX `users_status_idx` ON `users`(`status`);

-- AddForeignKey
ALTER TABLE `merchandise_redemptions` ADD CONSTRAINT `merchandise_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchandise_redemptions` ADD CONSTRAINT `merchandise_redemptions_merchandise_id_fkey` FOREIGN KEY (`merchandise_id`) REFERENCES `merchandise_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchandise_redemptions` ADD CONSTRAINT `merchandise_redemptions_pickup_pos_id_fkey` FOREIGN KEY (`pickup_pos_id`) REFERENCES `pickup_points`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
