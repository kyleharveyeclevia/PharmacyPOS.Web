# Database scripts and automatic startup synchronization

The canonical schema is in `Tables/*.sql`, `Stored Procedures/*.sql`, and
`Migrations/*.sql`. The numbered setup files are historical data exports. The
backend does not run those exports or copy their user/customer data into a new database.

Start the backend normally with `dotnet run --project backend/PharmacyApi.csproj`.
Before accepting requests, it uses `ConnectionStrings:Default` to:

1. Create the configured application database if missing, using the SQL Server
   instance's default data/log paths.
2. Create missing tables and add missing columns from their CREATE TABLE definitions.
3. Apply unapplied migrations in filename order, recorded in `dbo.__SchemaMigrations`.
4. Add missing defaults, keys, relationships, checks, and indexes.
5. Create or update every stored procedure with CREATE OR ALTER PROCEDURE.
6. If Users is empty, create the initial active Admin account: username `admin`,
   password `dev-admin-change-me`. The password is stored as a BCrypt hash.

Existing tables, columns and data are retained. Startup does not drop columns or
automatically change their types, lengths, nullability or existing defaults. Use a
new migration for these changes. All schema/data migrations and procedure updates
run in one transaction; a failure stops startup and rolls that transaction back.
An instance-wide application lock prevents simultaneous backend startups from
deploying the same database concurrently. Database creation is outside that transaction.

## Adding a column

Edit the CREATE TABLE in its table file, for example in `Tables/Products.sql`:

```sql
[StorageLocation] nvarchar(100) NULL,
```

Restart the backend. It adds this column only if it is missing. For a required
column on an existing populated table, supply a default:

```sql
[StorageLocation] nvarchar(100) NOT NULL
    CONSTRAINT DF_Products_StorageLocation DEFAULT(''),
```

Alternatively, add it nullable first and use an explicit backfill migration before
making it required. Missing defaults declared in a separate ALTER TABLE are also
attached when a new column is added. Define columns inside CREATE TABLE; separate
ALTER TABLE ADD statements in table files are reserved for constraints.

Keep one CREATE TABLE per table file and one procedure per procedure file. Use
`dbo` names. Add table relationships as separate ALTER TABLE statements where
possible so creation order is independent of filenames. Schema scripts must not
contain USE statements that target another database; startup deliberately ignores
the exported USE/SET wrappers and uses the configured connection database.

For deliberate data changes, create `Migrations/002_Description.sql` (then 003,
etc.). Applied migrations are immutable: changing one fails startup; add a new
migration instead. New required columns are synchronized before migrations, so
introduce a nullable/defaulted column before a migration that backfills it.

## Inventory and receipt integrity

`InventoryBatches` stores quantities and expiry per batch. Sale items retain the
batch used; return items link to their original sale item. Sales allocate the
earliest-expiring unexpired stock first. Products retain an aggregate stock count
for compatibility with the existing UI. Stock-writing procedures update both
records atomically. Receive a new batch with `POST /api/products/{id}/batches`
(`BatchNo`, `ExpiryDate`, `Quantity`) or `sp_ReceiveBatch`; list them with GET at
the same URL. Positive generic adjustments correct the oldest existing batch;
use batch receiving when adding a distinct delivery.

The first migration creates legacy batches from product stock, backfills branch
records, maps known terminal codes, leaves unknown historical terminal references
NULL, closes all but the newest duplicate open session for each user, and removes
the redundant terminal-code constraint. Legacy receipt items keep BatchId NULL
because their original batch cannot be reconstructed; stock reversals use the
legacy batch in that case. New sessions require a valid, active terminal.

Returns are bounded by original sold quantities and use the original receipt's
paid-to-subtotal ratio, so caller-supplied refund prices cannot inflate refunds.
The final full return absorbs rounding differences. Voiding a return removes its
restored stock; the operation fails if that batch stock has already been sold.
Void active returns before voiding their original sale.

The existing single-batch fields on Products remain available. For products with
multiple batches, use the batch API rather than overwriting their batch metadata.

## Configuration and deployment

Scripts are included in build/publish output. Source runs read the sibling
`database` directory; published runs read `database` beside the application.
Override the location with `Database:ScriptsPath` or `Database__ScriptsPath`.
Use SQL Server 2022-compatible syntax. The SQL login needs database creation
permission for first setup and DDL permissions for subsequent upgrades.

A fresh database contains the schema and only the default admin user. Startup
does not import transaction data, receipt items, demo products/customers, or
terminals from the historical exports. Initialize your branches and terminals
before using the POS. Existing users, including a changed admin password, are
preserved; the bootstrap never updates or resets an existing account.

## Integration checks

```powershell
dotnet run --project tests/PharmacyApi.DatabaseTests -- database
```

The runner defaults to localhost with Windows authentication. Override
`PHARMACY_TEST_SQL` with a server connection string if needed. It creates only
uniquely named `PharmacySchemaTests_` databases, checks schema synchronization,
concurrent inventory writes, returns, voids, batch expiry and migration of the
historical export, and removes those databases afterward. It never deploys to
the application database.
