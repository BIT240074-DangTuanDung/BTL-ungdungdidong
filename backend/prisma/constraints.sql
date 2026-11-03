-- Reference copy: included in applied migration 20261103050332_init_trohome.
-- Do not execute separately or edit the applied migration.
CREATE UNIQUE INDEX "Contract_one_active_room" ON "Contract" ("roomId") WHERE active;
CREATE UNIQUE INDEX "Contract_one_active_tenant" ON "Contract" ("tenantId") WHERE active;
CREATE UNIQUE INDEX "Inquiry_one_open_request" ON "Inquiry" ("userId", "roomId")
  WHERE "userId" IS NOT NULL AND status IN ('new', 'contacted', 'accepted');
ALTER TABLE "User" ADD CONSTRAINT "User_username_normalized"
  CHECK (username = lower(btrim(username)) AND length(username) > 0);
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_valid_values"
  CHECK (("endDate" IS NULL OR "endDate" > "startDate") AND "monthlyRent" > 0 AND deposit >= 0);
ALTER TABLE "Room" ADD CONSTRAINT "Room_valid_values"
  CHECK (area > 0 AND price >= 0 AND deposit >= 0 AND "electricityRate" >= 0
    AND "waterRate" >= 0 AND "maxOccupants" > 0
    AND "currentOccupantsCount" BETWEEN 0 AND "maxOccupants");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_valid_values"
  CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    AND rent >= 0 AND other >= 0 AND "electricityRate" >= 0 AND "waterRate" >= 0
    AND "electricityOld" >= 0 AND "electricityNew" >= "electricityOld"
    AND "waterOld" >= 0 AND "waterNew" >= "waterOld"
    AND ((status = 'paid' AND "paidAt" IS NOT NULL) OR (status <> 'paid' AND "paidAt" IS NULL)));
