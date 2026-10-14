ALTER TABLE "Order"
ADD COLUMN "stockReservedUntil" TIMESTAMP(3);

CREATE INDEX "Order_status_stockReservedUntil_idx"
ON "Order"("status", "stockReservedUntil");
