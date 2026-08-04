-- Persist the provider payment lifecycle without storing card data.
ALTER TABLE `Checkout`
    ADD COLUMN `paymentProvider` VARCHAR(40) NULL,
    ADD COLUMN `paymentReference` VARCHAR(255) NULL,
    ADD COLUMN `paymentStatus` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NULL;

CREATE UNIQUE INDEX `Checkout_paymentReference_key` ON `Checkout`(`paymentReference`);

ALTER TABLE `Order`
    ADD COLUMN `paymentReference` VARCHAR(255) NULL;

CREATE UNIQUE INDEX `Order_paymentReference_key` ON `Order`(`paymentReference`);
