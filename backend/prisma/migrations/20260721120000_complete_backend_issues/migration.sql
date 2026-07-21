-- Preserve only one active invitation for the same target before creating the
-- unique deduplication keys. Older databases may already contain duplicates.
ALTER TABLE `OrganizerInvitation` ADD COLUMN `dedupKey` CHAR(64) NULL;
ALTER TABLE `StaffInvitation` ADD COLUMN `dedupKey` CHAR(64) NULL;

UPDATE `OrganizerInvitation`
SET `status` = 'EXPIRED'
WHERE `status` = 'PENDING' AND `expiresAt` <= CURRENT_TIMESTAMP(3);

UPDATE `StaffInvitation`
SET `status` = 'EXPIRED'
WHERE `status` = 'PENDING' AND `expiresAt` <= CURRENT_TIMESTAMP(3);

UPDATE `OrganizerInvitation` AS duplicate
JOIN `OrganizerInvitation` AS keeper
  ON LOWER(duplicate.`email`) = LOWER(keeper.`email`)
 AND keeper.`status` = 'PENDING'
 AND (
   keeper.`createdAt` < duplicate.`createdAt`
   OR (keeper.`createdAt` = duplicate.`createdAt` AND keeper.`id` < duplicate.`id`)
 )
SET duplicate.`status` = 'REVOKED'
WHERE duplicate.`status` = 'PENDING';

UPDATE `StaffInvitation` AS duplicate
JOIN `StaffInvitation` AS keeper
  ON duplicate.`eventId` = keeper.`eventId`
 AND LOWER(duplicate.`email`) = LOWER(keeper.`email`)
 AND keeper.`status` = 'PENDING'
 AND (
   keeper.`createdAt` < duplicate.`createdAt`
   OR (keeper.`createdAt` = duplicate.`createdAt` AND keeper.`id` < duplicate.`id`)
 )
SET duplicate.`status` = 'REVOKED'
WHERE duplicate.`status` = 'PENDING';

UPDATE `OrganizerInvitation`
SET `dedupKey` = SHA2(LOWER(`email`), 256)
WHERE `status` = 'PENDING';

UPDATE `StaffInvitation`
SET `dedupKey` = SHA2(CONCAT(`eventId`, ':', LOWER(`email`)), 256)
WHERE `status` = 'PENDING';

CREATE UNIQUE INDEX `OrganizerInvitation_dedupKey_key` ON `OrganizerInvitation`(`dedupKey`);
CREATE UNIQUE INDEX `StaffInvitation_dedupKey_key` ON `StaffInvitation`(`dedupKey`);

ALTER TABLE `AuditLog`
  MODIFY `action` ENUM(
    'ORGANIZER_INVITED',
    'ORGANIZER_INVITE_ACCEPTED',
    'ORGANIZER_INVITE_REVOKED',
    'STAFF_INVITED',
    'STAFF_INVITE_ACCEPTED',
    'STAFF_INVITE_REVOKED',
    'EVENT_PUBLISHED',
    'EVENT_CANCELLED',
    'CAPACITY_CHANGED',
    'CHECKOUT_CREATED',
    'CHECKOUT_CANCELLED',
    'CHECKOUT_EXPIRED',
    'CHECKOUT_ABANDONED',
    'ORDER_CONFIRMED',
    'ORDER_CANCELLED',
    'TICKET_VALIDATED'
  ) NOT NULL;
