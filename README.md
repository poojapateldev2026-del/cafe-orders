# Café Order Management System

A MERN-stack web app (MongoDB, Express, React, Node.js) where customers order from a café menu and café staff (admins) prepare the orders and manage the menu.

**Deployment URL:** _add your university EC2 URL here_  
**Release tag:** _add your tag, e.g. v1.0.0_

## User roles and workflows

| Role | Workflow (end to end) |
| --- | --- |
| **Customer** | Register / log in → browse the menu → build an order (dine-in with table number, or takeaway) → place it → track its status live → cancel it while it is still pending → view order history |
| **Admin** (café staff) | Log in → watch the Orders Board → move each order Pending → Preparing → Ready → Served (or cancel) → add / edit availability / delete menu items → see today's open orders and revenue |

Customers can only see and cancel **their own** orders. Admin-only routes return `403` for customers. Public sign-up always creates a customer; the admin account is created with the seed script.

## Meeting the minimum scope

- **Authenticated, separated roles:** JWT login, bcrypt-hashed passwords, role middleware on the API, role-specific screens in the UI
- **Persistent data:** MongoDB collections `users`, `menuitems`, `orders`
- **Data operations:** create/read/update/delete menu items; create/read/update orders; register/login
- **Input validation:** server-side on every write (types, ranges, lengths, enums, valid status transitions) and client-side on the forms, with field-level error messages
- **Deployed workflow:** see [DEPLOYMENT.md](DEPLOYMENT.md)

## Architecture summary

```
React (Vite) SPA  ──/api (JSON, Bearer JWT)──►  Express API  ──Mongoose──►  MongoDB
 ├ AuthContext (session)                          ├ routes/auth.js    register, login, me
 ├ Customer: NewOrder, MyOrders                   ├ routes/menu.js    menu CRUD (admin writes)
 └ Admin: OrdersBoard, MenuManager                ├ routes/orders.js  place / track / process orders
                                                  ├ middleware/auth.js  authenticate + requireRole
                                                  └ models/ User, MenuItem, Order
```

Key design decisions:
- **Server-calculated totals:** the client sends only item IDs and quantities; prices are read from MongoDB so totals cannot be tampered with.
- **Order status state machine:** `pending → preparing → ready → served`, with `cancelled` allowed from any open state; invalid jumps are rejected with `409`.
- **Price snapshot:** each order line stores the name and price at order time, so later menu edits don't change past orders.
- **Single deployable:** in production Express serves the built React app, so one process / one port serves everything.
- **Polling, not WebSockets:** the board and "My Orders" refresh every 5 seconds to keep the implementation simple.

## Local setup

Requirements: Node.js 18+, MongoDB (local, or an Atlas connection string).

```bash
# API
cd backend
cp .env.example .env
#   edit .env: set JWT_SECRET (32+ chars), ADMIN_EMAIL and ADMIN_PASSWORD
npm install
npm run seed        # creates the admin account and a sample menu
npm run dev         # http://localhost:5000

# Client (new terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173  (proxies /api to :5000)
```

Log in as the admin with the credentials you put in `.env`, and register a normal account for the customer role.

## API overview

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET | `/api/auth/me` | Signed in |
| GET | `/api/menu` | Signed in (customers see available items only) |
| POST / PUT / DELETE | `/api/menu`, `/api/menu/:id` | Admin |
| POST | `/api/orders` | Customer |
| GET | `/api/orders/mine` | Customer |
| PATCH | `/api/orders/:id/cancel` | Customer (own, pending only) |
| GET | `/api/orders`, `/api/orders/stats/today` | Admin |
| PATCH | `/api/orders/:id/status` | Admin |

## Known limitations

- Order numbers are `count of today's orders + 1`; two simultaneous orders could get the same number (a counter collection would fix this).
- No password reset, email verification or refresh tokens; JWTs last 7 days and are kept in `localStorage`.
- No automated test suite yet.
- Payments are not implemented; "total" is informational.
- Polling every 5 seconds instead of real-time push.
- No pagination beyond fixed result limits (100 / 200 orders).

## Security notes

No secrets are committed (`.env` is git-ignored; `.env.example` has blanks). Passwords are hashed with bcrypt, the API uses `helmet` headers and rate-limits login/register.
