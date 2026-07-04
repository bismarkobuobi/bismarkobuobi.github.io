# Designing a Multitenant Backend Without Losing Your Mind

Multitenancy sounds simple until you build it: one application serving many independent customers (tenants), each believing they have the system to themselves. I learned a lot building a multitenant e-commerce platform, and here are the ideas that mattered most.

## What "tenant" actually means

A **tenant** is an isolated customer of your platform — in an e-commerce context, think of each vendor or store. Every request has to answer one question before anything else happens:

> Which tenant is this request for, and is it allowed to see this data?

Get that wrong and one store sees another store's orders. That's not a bug; that's a headline.

## Three ways to isolate data

There's no single right answer — it's a trade-off between isolation, cost, and operational effort.

1. **Database per tenant** — strongest isolation, most expensive to run and migrate.
2. **Schema per tenant** — a good middle ground on PostgreSQL.
3. **Shared tables with a `tenant_id` column** — cheapest and simplest, but every single query *must* filter by tenant.

I went with the shared-table approach and leaned on a golden rule:

```sql
-- Every tenant-scoped query MUST include this filter
SELECT * FROM products WHERE tenant_id = $1 AND id = $2;
```

## Enforce isolation in one place

The dangerous part of shared tables is forgetting the `tenant_id` filter *once*. The fix is to never rely on memory. Resolve the tenant in middleware, attach it to the request, and route every data access through a layer that injects the filter automatically:

```js
// tenant middleware (simplified)
function resolveTenant(req, res, next) {
  const tenant = req.headers['x-tenant'] || subdomainOf(req.hostname);
  if (!tenant) return res.status(400).json({ error: 'Unknown tenant' });
  req.tenantId = tenant;
  next();
}
```

If you can, push it all the way down with **row-level security** so the database itself refuses to return the wrong tenant's rows.

## Things I wish I'd known earlier

- **Add `tenant_id` to your indexes**, not just your `WHERE` clauses. A composite index on `(tenant_id, created_at)` beats a bare `created_at` index every time.
- **Test with more than one tenant from day one.** Bugs hide when there's only a single tenant in the database.
- **Rate limit per tenant**, so one noisy customer can't starve the rest.

## Takeaway

Multitenancy is 20% database schema and 80% discipline. Decide your isolation strategy early, enforce it in exactly one place, and make it impossible to write a query that forgets who it's for.

*Next time: how I handle background jobs across tenants without them stepping on each other.*
