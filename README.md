# RxPharmacy Plus — Web POS
## React JS + ASP.NET Core 8 Web API + SQL Server (Dapper + Stored Procedures)

---

## Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React 18 (plain JSX — no TypeScript)            |
| Styling      | Tailwind CSS                                    |
| HTTP Client  | Axios with JWT interceptor                      |
| Backend      | ASP.NET Core 8 Web API                          |
| Data Access  | **Dapper only — zero Entity Framework**         |
| Database     | SQL Server 2019+ / LocalDB / Express            |
| Auth         | JWT Bearer tokens + BCrypt password hashing     |

---

## Project Structure

```
PharmacyPOS_Web/
├── backend/
│   ├── PharmacyApi.csproj
│   ├── Program.cs                         # Startup, DI, JWT, CORS, Swagger
│   ├── appsettings.json                   # Connection string + JWT config
│   ├── Controllers/
│   │   ├── AuthController.cs              # POST /api/auth/login|logout|me
│   │   ├── ProductsController.cs          # CRUD + barcode + stock adjust
│   │   ├── TransactionsController.cs      # sale, void, return, queries
│   │   ├── ReportsController.cs           # dashboard, xread, zread, summary
│   │   └── UsersController.cs             # Admin-only user management
│   ├── Services/
│   │   ├── AuthService.cs                 # BCrypt verify, JWT generation, sessions
│   │   └── PharmacyService.cs             # All SP calls via Dapper, typed results
│   ├── Data/
│   │   └── DbConnectionFactory.cs         # IDbConnectionFactory → SqlConnection
│   ├── Models/
│   │   └── Models.cs                      # All DTOs, request/response types
│   └── Middleware/
│       └── ClaimsHelper.cs                # JWT claim extension methods
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js                     # Proxy /api → localhost:5000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json                       # React, axios, lucide-react, tailwind
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                        # BrowserRouter + ProtectedRoute
│       ├── index.css                      # Tailwind directives
│       ├── context/
│       │   └── AuthContext.jsx            # Global auth state + localStorage
│       ├── services/
│       │   └── api.js                     # Axios instance + all API call groups
│       ├── components/layout/
│       │   └── Layout.jsx                 # Sidebar, topbar, logout/Z-Read modal
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx          # Live clock, stat cards, recent tx
│           ├── POSPage.jsx                # Barcode scan, cart, SC/PWD, F12
│           ├── InventoryPage.jsx          # CRUD slide-in panel, stock adjust
│           ├── ReportsPage.jsx            # Date filter, X-Read, Z-Read, void
│           └── UsersPage.jsx              # User CRUD, role badges, toggle
│
└── database/
    └── 00_SETUP_ALL.sql                   # Single file — runs everything
```

---

## Setup (3 steps)

### Step 1 — Database

Open **SQL Server Management Studio (SSMS)** and run:

```
database/00_SETUP_ALL.sql
```

This single file creates the `RxPharmacyDB` database, all 9 tables, seeds
25 products, 4 customers, 5 suppliers, 3 users, and creates all 26 stored procedures.

### Step 2 — Backend

Edit the connection string in `backend/appsettings.json` if needed:

```json
"ConnectionStrings": {
  "Default": "Server=(localdb)\\MSSQLLocalDB;Database=RxPharmacyDB;Integrated Security=True;TrustServerCertificate=True;"
}
```

Then run:

```bash
cd backend
dotnet restore
dotnet run
```

API runs at: **http://localhost:5000**
Swagger UI:  **http://localhost:5000/swagger**

### Step 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: **http://localhost:5173**

---

## Default Login Credentials

| Username     | Password   | Role        |
|--------------|------------|-------------|
| `admin`      | `password` | Admin       |
| `cashier1`   | `password` | Cashier     |
| `pharmacist1`| `password` | Pharmacist  |

> **Change all passwords immediately after first login** via User Management.

---

## API Reference

| Method  | Endpoint                         | Role              | Description              |
|---------|----------------------------------|-------------------|--------------------------|
| POST    | `/api/auth/login`                | Public            | Login, get JWT           |
| POST    | `/api/auth/logout`               | JWT               | Close session            |
| GET     | `/api/products`                  | JWT               | All products             |
| GET     | `/api/products/search?q=`        | JWT               | Search products          |
| GET     | `/api/products/barcode/{b}`      | JWT               | Scan barcode             |
| GET     | `/api/products/lowstock`         | JWT               | Low stock list           |
| POST    | `/api/products`                  | Admin/Pharmacist  | Add product              |
| PUT     | `/api/products/{id}`             | Admin/Pharmacist  | Update product           |
| PATCH   | `/api/products/{id}/toggle`      | Admin/Pharmacist  | Toggle active            |
| POST    | `/api/products/{id}/stock`       | Admin/Pharmacist  | Adjust stock             |
| GET     | `/api/products/categories`       | JWT               | Category list            |
| GET     | `/api/products/suppliers`        | JWT               | Supplier list            |
| GET     | `/api/products/customers`        | JWT               | Customer list            |
| POST    | `/api/transactions/sale`         | JWT               | Process sale             |
| GET     | `/api/transactions?start=&end=`  | JWT               | Transactions by range    |
| GET     | `/api/transactions/{id}`         | JWT               | Get by ID                |
| GET     | `/api/transactions/receipt/{r}`  | JWT               | Get by receipt           |
| POST    | `/api/transactions/{id}/void`    | Admin/Pharmacist  | Void transaction         |
| POST    | `/api/transactions/{id}/return`  | Admin/Pharmacist  | Process return           |
| GET     | `/api/reports/dashboard`         | JWT               | Dashboard stats          |
| GET     | `/api/reports/xread`             | JWT               | X-Read (current session) |
| POST    | `/api/reports/zread`             | JWT               | Z-Read + close session   |
| GET     | `/api/reports/summary`           | JWT               | Sales summary by range   |
| GET     | `/api/reports/sessions`          | JWT               | Sessions by date         |
| GET     | `/api/users`                     | Admin             | All users                |
| POST    | `/api/users`                     | Admin             | Create user              |
| PUT     | `/api/users/{id}`                | Admin             | Update user              |
| PATCH   | `/api/users/{id}/toggle`         | Admin             | Toggle user active       |

---

## SC/PWD Discount — Philippine Law

**RA 9994** (Senior Citizens) and **RA 9442** (PWDs) require:

- 20% discount applied on the **VAT-exclusive price** (i.e., divide by 1.12 first)
- The transaction is **VAT-exempt** — no VAT charged at all

```
Shelf price (VAT-inclusive):  ₱112.00
÷ 1.12 → VAT-exclusive base:  ₱100.00
× 20%  → Discount:             ₱ 20.00
Net payable (VAT-exempt):      ₱ 80.00  ← zero VAT
```

This is implemented identically in both:
- `PharmacyService.ProcessSaleAsync()` (backend calculation sent to SP)
- `POSPage.jsx` (live preview in the payment panel)

---

## Session Flow

```
Login  →  sp_OpenSession  →  JWT contains sessionId
  │
  ├── X-Read  →  GET /api/reports/xread (session stays open)
  │
  └── Z-Read  →  POST /api/reports/zread
                    → GenerateZReadAsync()
                    → sp_CloseSession()   ← session closed server-side
                    → frontend clears localStorage
```

**Important:** After calling Z-Read, do NOT call `/api/auth/logout` — the session is already closed. The `Layout.jsx` handles this correctly with two separate handlers (`doLogout(false)` vs `doLogout(true)`).

---

## Stored Procedures (26 total)

| Procedure                      | Description                              |
|--------------------------------|------------------------------------------|
| `sp_LoginUser`                 | Fetch user row for BCrypt verification   |
| `sp_UpdateLastLogin`           | Stamp login timestamp                    |
| `sp_OpenSession`               | Create session, return SessionId         |
| `sp_CloseSession`              | Close session with closing cash          |
| `sp_GetAllUsers`               | All users (no password hash)             |
| `sp_CreateUser`                | Insert new user                          |
| `sp_UpdateUser`                | Update user profile                      |
| `sp_UpdateUserPassword`        | Update password hash only                |
| `sp_ToggleUserStatus`          | Flip IsActive (cannot self-deactivate)   |
| `sp_GetAllProducts`            | Full product list with computed flags    |
| `sp_SearchProducts`            | Name/barcode/generic search (TOP 50)     |
| `sp_GetProductByBarcode`       | Single product by barcode                |
| `sp_GetLowStockProducts`       | Products at or below reorder level       |
| `sp_AddProduct`                | Insert product                           |
| `sp_UpdateProduct`             | Update product                           |
| `sp_AdjustStock`               | Adjust stock with audit trail            |
| `sp_GetCategories`             | Category lookup                          |
| `sp_GetSuppliers`              | Supplier lookup                          |
| `sp_GetCustomers`              | Customer lookup (with SC/PWD flags)      |
| `sp_ProcessSale`               | Full sale: validate → insert → deduct stock |
| `sp_VoidTransaction`           | Void + restore stock                     |
| `sp_ProcessReturn`             | Return + restore stock                   |
| `sp_GetTransactionById`        | Transaction header + line items (2 RS)   |
| `sp_GetTransactionByReceipt`   | Same but by receipt number               |
| `sp_GetTransactionsByDateRange`| Transactions list for date range         |
| `sp_GetXReadData`              | 3 result sets: session + summary + items |
| `sp_GetZReadData`              | 4 result sets: session + summary + hourly + top products |
| `sp_GetDashboardStats`         | 4 result sets: today + low stock + recent tx + low items |
| `sp_GetSalesSummaryByDateRange`| Aggregate totals for date range          |
| `sp_GetSessionsByDate`         | Sessions list for a given date           |

---

## Key Architecture Decisions

**No EF, no ORM.** Every database call goes through a named stored procedure via Dapper. No inline SQL anywhere.

**Typed Dapper results.** No `dynamic` keyword used. All SP result sets map to private typed inner classes in `PharmacyService.cs`, preventing runtime cast failures.

**PascalCase JSON throughout.** `Program.cs` sets `PropertyNamingPolicy = null` for API responses. `PharmacyService.cs` sets the same for OPENJSON serialization. This means SP `WITH()` column names match C# property names exactly.

**OPENJSON fix.** `sp_ProcessSale` and `sp_ProcessReturn` parse JSON into a `@TableVariable` first, then JOIN in the `UPDATE ... FROM`. Inline OPENJSON subqueries inside `UPDATE ... FROM` cause SQL Server alias resolution errors.
