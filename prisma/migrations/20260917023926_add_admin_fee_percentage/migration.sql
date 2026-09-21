/*
  Warnings:

  - The values [superadmin,admin_wilayah,operator_pos] on the enum `users_role` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[trip_id,customer_id]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[service_type,size]` on the table `pricing_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `admin_fee_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 10.00;

-- AlterTable
ALTER TABLE `pricing_settings` ADD COLUMN `max_weight_kg` DECIMAL(8, 2) NULL,
    ADD COLUMN `size` ENUM('xxs', 'xs', 's', 'm', 'l', 'xl') NULL;

-- AlterTable
ALTER TABLE `trips` ADD COLUMN `service_type` ENUM('motor', 'mobil', 'barang') NOT NULL DEFAULT 'mobil';

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('admin', 'regional', 'operator', 'mitra', 'customer') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `conversations_trip_id_customer_id_key` ON `conversations`(`trip_id`, `customer_id`);

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
