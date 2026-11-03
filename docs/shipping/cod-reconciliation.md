# COD and financial definitions

Currency is VND. Monetary records are separate from order/payment status and delivery milestones.

| Measure | Definition |
| --- | --- |
| Expected | Sum of initial expected postings and signed expected_adjustment postings for the order |
| Collected | Sum of ADMIN-confirmed collected receipts; positive amount plus proof required |
| Provider reported | Sum of authenticated, deduplicated GHN cod remittance-event amounts; not bank verified |
| Bank confirmed | Sum of ADMIN bank_confirmed proof receipts |
| Outstanding | max(0, expected − bank confirmed) |
| Difference | bank confirmed − expected |
| COD review count in analytics | Number of orders in selected shipment cohort with expected != bank confirmed; includes pending collections, not proof of a loss |

Initial expected posting is atomic with shipment reservation. Paid/prepaid orders reserve zero COD. Updating COD requires admin, live eligible state, matching local/provider amount and max 5 million VND; local adjustment, shipment amount and action completion are atomic. External uncertainty requires manual reconciliation. Online payment received later raises ONLINE_PAID_WITH_ACTIVE_COD for any active positive carrier COD; operator must verify/correct the carrier instruction. No automatic second charge, refund or bank settlement occurs.

Receipt request IDs deduplicate collected entries. A trimmed uppercased bank proof hash is globally unique; reused proof with a conflicting order/amount is rejected. Proof should identify one allocated receipt, not a whole unallocated settlement batch. Partial receipts and overpayments remain visible as differences; nothing fabricates a balancing posting.

Callbacks deduplicate by documented event identity. Repeated notifications with different provider timestamps remain distinct evidence; aggregate remittance must be reviewed against actual bank statements. Unknown/new financial schemas must not be treated as confirmed receipts.

## Shipping cost and promotion separation

Quote actualFee is carrier's quoted price, customerFee is the amount charged to customer, subsidy is the merchant-funded difference. actualProviderFee is a separately received provider cost; absent total stays unknown, not guessed from a shortened example.

Existing free shipping at 300,000 VND remains. Extra enabled promotions require known unit costs and cap subsidy by fee, promotion limit and remaining margin after voucher and required minimum margin. Quote/preview never consumes voucher use. No automatic refunds or changes to commercial total after shipping callbacks.

## Analytics formulas

Cohort: shipments created between selected inclusive timestamps, optional current shipping-state filter. Admin calendar dates use Asia/Bangkok (+07:00). Max interval 366 days, max 10,000 rows.

- Total = cohort size. Delivered/failed = current DELIVERED/DELIVERY_FAILED counts.
- Return rate = current RETURNED / total; empty denominator -> null.
- On-time = delivered with known ETA and last event time, lastEventAt <= ETA / eligible delivered.
- Average duration = mean hours from shipment creation to delivered lastEventAt (updated_at fallback); this is not elapsed time from order placement.
- Mean quoted cost = sum snapshot.actualFee / total.
- Mean actual cost = mean actualProviderFee among records that have it.
- Fee variance = sum(actualProviderFee − snapshot.actualFee) among known costs.
- Subsidy = sum snapshot.subsidy; COD outstanding/review count as above, including all ledger history of cohort orders.
- Manual attention = current MANUAL_REVIEW, DELIVERY_FAILED or RETURN_REQUESTED count.
- Province/warehouse groups aggregate shipment count and quoted cost.
- Category cost = estimated allocation of quoted fee proportional to purchased merchandise subtotal, explicitly marked estimated. It is not a provider category tariff.

Alerts/inbox/audit retain history. Staff may inspect operational reports; financial approvals and raw COD ledger routes require ADMIN. Real bank statements, GHN account reports and storage retention are external deployment prerequisites.

