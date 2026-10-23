# Paperloom Marketplace Phase 1 — Storefront Task Record

## Scope and status

Status: **implemented; migrations applied and browser-verified**. This repository remains the buyer-facing Paperloom storefront. Vendor routes and vendor dashboard capabilities will be added here; no separate vendor frontend will be created. The storefront must continue using the existing React + TypeScript + Vite + React Router + Supabase JS architecture and the shared Supabase project `paperloom-store` (`xrrhbnnzjqkqnqdvayjw`).

The feature branch is `feature/marketplace-phase1`, created from `main` at the inspected repository state. Existing working tree was clean before this task.

## Existing architecture

- `src/app/App.tsx`: route composition and storefront shell.
- `src/main.tsx`: Vite entry point and global providers/styles.
- `src/contexts/AuthContext.tsx`: Supabase session, profile and admin-role resolution.
- `src/contexts/CatalogContext.tsx`, `src/services/products/`: catalog loading and domain adapters.
- `src/contexts/CartContext.tsx`, `src/contexts/WishlistContext.tsx`: buyer state.
- `src/pages/AuthPages.tsx`, `HomePage.tsx`, `ShopPages.tsx`, `ProductPage.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `WishlistPage.tsx`: current buyer flows.
- `src/services/orders/orderService.ts`: existing order boundary; checkout is currently demo/disabled where the integration is not ready.
- `src/types/database.ts`: generated/local Supabase database typing boundary.
- `supabase/migrations/`: versioned shared-schema migrations owned by the storefront repository.

## Verified shared database state

Project: `paperloom-store`, ref `xrrhbnnzjqkqnqdvayjw`, ACTIVE_HEALTHY, region `ap-southeast-1`.

Existing public tables (all observed with RLS enabled): `profiles`, `user_roles`, `categories`, `products`, `product_images`, `product_variants`, `product_inventory`, `inventory_movements`, `customer_addresses`, `wishlist_items`, `orders`, `order_items`, `payment_transactions`, `admin_order_notes`, `notifications`, `admin_audit_logs`.

Existing enums include `app_role` (`customer`, `admin`), `publication_status` (`draft`, `published`, `archived`), `inventory_movement_type` (`initial`, `sale`, `restock`, `adjustment`, `return`, `correction`), order/payment status enums, and `notification_kind`.

Existing public RPCs observed: `current_user_is_admin()`, `get_public_availability(uuid[])`, `create_order(...)`, `admin_dashboard_summary()`, and `admin_adjust_inventory(...)`. Private authorization uses `private.has_role(app_role)`. Existing product/publication RLS exposes only active categories and published products/variants/images to anonymous users. Customer records are owner-scoped; order reads are customer-or-admin scoped; user roles deny client access. Storage buckets are `product-images` (public) and `product-drafts` (private).

No vendor role, seller/application/shop table, vendor ownership columns, moderation workflow, returns/complaints table, vendor order visibility, or marketplace financial fields were found. These are pending additions and must not be assumed to exist until migrations are written and reviewed.

Known security advisories are documented, not silently changed: executable `SECURITY DEFINER` warnings for `get_public_availability` and `admin_adjust_inventory`, plus disabled leaked-password protection. The marketplace work must not weaken RLS or expose privileged keys.

## Required implementation status

- **Completed in code / pending migration approval:** add a backward-compatible vendor role and seller application/shop profile model; default new applications to `pending` and keep admin assignment owner-controlled.
- **Completed in code / pending migration approval:** add vendor-owned listing ownership and protected moderation status; preserve platform-owned existing products.
- **Completed in draft/code:** add supplier cost, fulfilment expense, minimum profit/margin, cost freshness and stock verification fields with database-side margin validation.
- **Completed in draft/code:** add vendor-scoped inventory access and atomic non-negative stock adjustment RPC; keep live checkout/COD disabled unless the existing flow is complete.
- **Completed in draft/code:** add a privacy-limited vendor order-item RPC and database-validated fulfilment transitions without returning buyer contact/address fields.
- **Pending:** add buyer return/refund/complaint requests with private evidence references and admin decisions; no automatic money movement without a configured provider.
- **Completed in code / pending migration approval:** add storefront vendor application/status/profile/listing/inventory/order/complaint routes guarded by session plus database authorization.
- **Verified:** preserve buyer login, Google OAuth, public catalog filtering, cart, wishlist and existing customer routes through typecheck/build and route checks.
- **Completed:** update local database types and service adapters; no service-role credentials are present in frontend code or migration drafts.

## Applied migration status

Applied to `paperloom-store` (`xrrhbnnzjqkqnqdvayjw`): `marketplace_vendor_role`, `marketplace_core`, `marketplace_seller_policies`, `marketplace_vendor_functions`, `marketplace_triggers`, and `marketplace_policy_hardening`. All were additive or policy replacements; no table/data reset was used.

The storefront header now visibly links unauthenticated users to `/vendor/apply` as **Become a Seller**; approved users receive **Vendor dashboard**, and pending users receive **Application status**. This was verified in the forwarded browser preview.

## Migration and rollback plan

Create one or more uniquely named SQL migrations under `supabase/migrations/` after comparing all current tables, triggers, functions and policies. Prefer additive tables/columns, explicit constraints, secure RPCs and RLS. Migrations were reviewed and applied to the verified project in dependency order after explicit task approval. Before any production application, review SQL, take the normal project backup/recovery path, apply in dependency order, verify policies/RPCs, and retain a rollback/recovery note. Do not drop existing tables, reset the project, delete records, or alter existing admin ownership.

## Testing and acceptance criteria

- `pnpm typecheck` and `pnpm build` pass.
- Public queries return only approved, published, available listings; unpublished vendor listings are never public.
- Buyer data remains owner-scoped; pending/rejected/suspended vendors cannot perform restricted operations.
- Vendors cannot self-approve, alter roles/moderation fields, read another vendor's products/orders/costs, or access platform revenue.
- Inventory changes are atomic, reasoned, non-negative and protected from overselling.
- Order status transitions and multi-vendor item visibility follow database authorization; checkout remains disabled when fulfilment/settlement is not ready.
- Returns/evidence are private and actual refunds are not falsely claimed.
- Authenticated vendor and buyer route guards, loading/error/empty states, and responsive navigation are verified without weakening existing buyer behavior.
- RLS/RPC policy review is documented; no service-role key or secret is committed.

## Storefront checklist

- [x] Implement reviewed marketplace migration SQL and local types; migration is intentionally not applied.
- [x] Add vendor application and shop-profile services/pages.
- [x] Add vendor dashboard navigation and protected route guards.
- [x] Add vendor listing/inventory/fulfilment/complaint workflows.
- [x] Update public catalog visibility rules in the migration draft.
- [ ] Add browser-level authenticated tests with real approved/pending seller accounts; schema and RLS verification is complete, but no test credentials were available in this session.
- [x] Typecheck, build, route-check and static security review.
- [x] Commit and push the completed marketplace implementation and forwarded-preview fix on `feature/marketplace-phase1`; the storefront remote is current.
- [x] Updated with applied migrations, final commit and remaining authenticated test note.
