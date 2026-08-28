# Building a Pharmacy That Lives on the Internet

Last time I promised two things: the admin experience, and the day I finally put something on a real server for real people to use.

This post is both. It just isn't the gym.

Somewhere between finishing that project and writing this, I picked up a real client - **Shaggysco Pharmacy**, an over-the-counter chemist on the first floor of Naa Plaza Building in Okaishie, Accra. They wanted to sell online. Not a mockup, not a portfolio piece: a shop with actual stock on actual shelves, actual customers, and an owner who would notice immediately if the delivery fee was wrong.

That changes how you build. The gym taught me security. This one taught me consequences.

As before, this is written for two people at once:

- If you don't code, read the plain-English parts and skip the *Deep dive* boxes. The whole story is still there.
- If you do code, the *Deep dive* boxes are where the bugs live.

## What are we even building?

A pharmacy wants to sell medicine online. So the software needs to:

1. Show a **catalogue** - paracetamol, vitamins, thermometers, blood pressure monitors.
2. Let somebody **fill a basket and check out**, paying by card, mobile money, or cash on delivery.
3. Tell the shop **an order arrived**, so a pharmacist can pack it.
4. Text the customer **when it's on the way**.
5. Give the staff a **dashboard** to run the catalogue, the stock, and the money.

Sounds like the gym with different nouns. It isn't, and the reason is the fifth word in that list: **medicine**.

Medicine expires. Medicine gets recalled by batch number. Medicine that's out of stock is not a disappointed customer, it's somebody who came for their blood pressure tablets and left without them. Almost every hard decision in this project traces back to that one difference.

## The rules I wrote before the code

Before I wrote a line, I wrote a file called `NON-NEGOTIABLES.md` - fifty numbered rules about secrets, auth, payments, and data. Things like *"APIs must never return more fields than the client needs"* and *"fail closed: if a permission check errors, deny access."*

Then I did the part that actually mattered: I taught the linter some of them.

**[ Deep dive - for the engineers ]**

ESLint can enforce house rules, not just style. A few of the fifty became `no-restricted-syntax` and `no-restricted-imports` entries, so breaking them fails the build rather than a code review:

```js
// Reading process.env directly, anywhere but the one file whose job it is
{
  selector: "MemberExpression[object.name='process'][property.name='env']",
  message:
    'Read configuration from `@/config/env`, not `process.env` directly - ' +
    'it is validated once at startup (rules 1, 6)',
}
```

That rule caught me later, in a script I'd written myself and forgotten the rule for. Which is exactly the point: I wrote the rules on a good day so they could catch me on a bad one.


> A rule in a document is a suggestion. A rule in the linter is a rule.

## The 30,000-foot view

Three applications, one brain. Same shape as the gym, and for the same reason - customers and staff have different audiences, different risks, and no business sharing a codebase.

```
      +--------------+          +--------------+
      |  STOREFRONT  |          |  DASHBOARD   |
      |  (customers) |          |   (staff)    |
      | React + Vite |          | React + Vite |
      +------+-------+          +------+-------+
             |                         |
             |      HTTPS / JSON       |
             +-----------+-------------+
                         |
                         v
              +---------------------+
              |      THE SERVER     |
              |   Express + Node    |
              |    (TypeScript)     |
              |                     |
              | catalog  orders     |
              | stock    expiry     |
              | staff    settings   |
              +---+------+------+---+
                  |      |      |
        +---------+      |      +---------+
        v                v                v
 +-------------+  +-------------+  +-------------+
 | PostgreSQL  |  |  Paystack   |  |   Arkesel   |
 | (via Prisma)|  | (the money) |  |  (the SMS)  |
 +-------------+  +-------------+  +-------------+
```

There are also two shared packages - one for domain types and pure functions, one for UI components - so the storefront and the dashboard can't drift on what an "order status" means.

The stack: **React 19 + Vite + TypeScript + Tailwind** on both frontends, **Express 5 + Prisma + PostgreSQL** behind them, **Paystack** for payments, **Arkesel** for SMS, all in an npm workspaces monorepo.

## The number that isn't in the database

Here's the first decision that felt strange and turned out to be the backbone of the whole thing.

**There is no "stock" column.**

You'd think a shop would store how many boxes of paracetamol it has. We don't. What we store is **batches** - each delivery that ever arrived, with its batch code, its expiry date, how many units came, and what they cost. Stock is then a question you *ask*, not a number you keep: the sum of every batch that hasn't expired.

This sounds like extra work until you notice what it buys you:

- A batch recall names a **batch code**. If you only stored a total, you couldn't answer "do we have any of BN-4471 left?"
- Expired stock stops counting **by itself**, at midnight, with nobody remembering to do anything.
- The Expiry screen and the stock count can never disagree, because they're the same data read two ways.

The rule that follows is the one that surprised the client: **the admin dashboard has no box for typing a stock number.** You can't type stock. Stock arrives the way it arrives in real life - a carton turns up, and you record what was on it.

**[ Deep dive - for the engineers ]**

Because stock is derived, the product form's schema is `.strict()` on the server, so a request carrying `stockQuantity` is *rejected* rather than quietly ignored:

```ts
export const productInputSchema = z
  .object({
    name: trimmed('Give the product a name', 160),
    priceMinor: z.number().int().min(1, 'A price of nothing is not a price'),
    // ...no stockQuantity. No rating. No slug.
  })
  .strict();
```

Silently dropping a field is worse than refusing it - the sender walks away believing it was applied.

When an order is placed, stock comes off oldest-expiry-first (FEFO - First Expired, First Out), inside the same transaction that creates the order. Two people checking out the last box at the same instant is a race, and the database is the only thing that can referee it.


While we're here: **every money value in this system is an integer of pesewas**, never a decimal. Every column that holds money ends in `Minor` - `priceMinor`, `totalMinor`, `unitCostMinor` - so you can grep for the ones you might have got wrong. Floating point money is a bug you don't find until somebody's change is off by a pesewa and the ledger stops balancing.

## The text message that cost three times as much

This is my favourite bug in the project, because the villain is a single character.

The shop pays per SMS. Not per message - per **segment**. A text is one segment if it's short, two if it's long, and every segment is money leaving a small business in Accra.

I knew that, so I wrote a check: if the message is longer than 160 characters, warn me. Clean, obvious, and completely wrong.

Here's what I'd missed. SMS has two alphabets. There's **GSM-7**, an old 128-character set that fits 160 characters in a segment. And there's **UCS-2**, which handles the rest of Unicode and fits **70**. If even one character in your message falls outside GSM-7, the *entire message* re-encodes as UCS-2 and your segment size collapses.

Now guess which character isn't in GSM-7.

The cedi sign. **₵**.

So a perfectly reasonable 143-character order confirmation, formatted nicely with `GH₵649.00`, was not one segment. It was **three**. The shop was paying triple for every text, and my length check sat there reporting everything was fine, because 143 is less than 160.

**[ Deep dive - for the engineers ]**

The fix was to count what the gateway actually bills, not characters:

```ts
export function segmentsFor(content: string): number {
  if (nonGsmCharacters(content).length > 0) {
    // One character outside GSM-7 re-encodes the whole message.
    return content.length <= 70 ? 1 : Math.ceil(content.length / 67);
  }
  return content.length <= 160 ? 1 : Math.ceil(content.length / 153);
}
```

(The 153 and 67 aren't typos - a concatenated message spends a few bits per segment on the headers that let the phone reassemble it.)

And money in a text message is now formatted deliberately differently from money on a screen:

```ts
/** `GHS 649.00`, never `GH₵649.00` - the cedi sign is not in GSM-7. */
function smsMoney(amountMinor: number): string {
  return `GHS ${(amountMinor / 100).toFixed(2)}`;
}
```

There's a test that asserts every template is pure GSM-7, so nobody can helpfully "improve" the copy with a curly apostrophe and triple the shop's phone bill.


> A guard that measures the wrong thing is worse than no guard at all. No guard, and you go looking. A wrong guard, and you believe you're covered.

## The export button that walked around the lock

Then a security one, in the same family as the gym's broken access control - but this time the lock was *there*, and the code walked around it.

The dashboard has role-based permissions. Owners can do everything; pharmacists run the shop; assistants pack orders. And there's a rule I'm quite pleased with: **assistants can't download anything.**

That looks harsh until you look at what the files contain. The orders export is a list of customers' names, addresses and phone numbers. The inventory export is every cost price the shop pays and every supplier's terms - the whole commercial position, in one file, on one laptop, forever. Reading one row on a screen and downloading ten thousand rows are different risks.

So the guard existed:

```ts
export function exportBlockedReason(role: StaffRole | undefined): string | null {
  if (!role) return 'Sign in to export.';
  if (role === 'assistant') {
    return 'Only a pharmacist or an owner can export. These files carry cost ' +
           'prices and customer details, so they are limited to the roles ' +
           'accountable for them.';
  }
  return null;
}
```

The guard was fine. The **CSV was being built in the browser.**

The orders page fetched every matching order into the page, assembled the file client-side, and handed it to the user. Which meant the export button's permission check was a *disabled button* - and a disabled button is a courtesy, not a control. Anybody who could open the orders screen already had every customer's address in their browser. The lock was on a door standing in an open field.

The fix was to move the export to the server, where the same guard runs against the request rather than against the UI - and where the download can be audit-logged, which a browser can never be trusted to do for itself.

> If your permission check can be satisfied by not clicking the button, it isn't a permission check.

## The feature that was never there

The client's single biggest ask wasn't a feature. It was **"I want to be found on Google."**

So I built the whole SEO layer: per-page titles and descriptions, canonical URLs, Open Graph tags for WhatsApp link previews, schema.org structured data marking the business as a `Pharmacy`, a sitemap, and a build step that bakes all of it into real HTML - because WhatsApp and Facebook don't run JavaScript, and a link shared in a group chat shows whatever was in the file as served.

I tested it. It worked. I shipped it.

Months later, checking something else entirely, I ran a production build and read the output properly for the first time:

```
[seo] VITE_SITE_ORIGIN is not set - skipping.
```

Except it *was* set. It was right there in the `.env` file.

Here's what had happened. Vite loads your `.env` for the app it's bundling. But the SEO step ran as its own separate process - `tsx scripts/generate-seo.mjs` - and that process never loaded any env file at all. So the origin was undefined, the script took its "not configured, skip quietly" branch, and **the entire SEO layer had never once run.**

What actually shipped to the internet: no sitemap. No canonical tags. No structured data. No link previews. And a live `robots.txt` reading:

```
Sitemap: SITE_ORIGIN_PLACEHOLDER/sitemap.xml
```

That's not a missing feature. That's an instruction to Google pointing at a URL that doesn't exist, published on the site of a client whose one request was to be found on Google. The build exited zero every time.

**[ Deep dive - for the engineers ]**

Two changes. The script loads the env file, and `build` calls it by name so the flag can't drift between the two entry points:

```json
"build": "npm run typecheck && vite build && npm run seo",
"seo": "tsx --env-file-if-exists=../../.env scripts/generate-seo.mjs"
```

And - the part that matters more - a missing origin now **fails the build** instead of warning:

```js
if (!ORIGIN) {
  console.error('[seo] VITE_SITE_ORIGIN is not set, so this build cannot be published.');
  process.exit(1);
}
```

Skipping doesn't produce a site without SEO. It produces a site with a *broken* one, and that was invisible in a passing build.

Going from broken to working took the route count from **0 to 39**, with structured data on every product page.


While I was in there I found its cousin. Every unknown URL - `/product/nope`, a typo, anything - returned **HTTP 200** serving the homepage's HTML, canonical tag and all. So every junk URL on the domain was telling Google *"I am the homepage."* That's a textbook soft 404, and it burns the crawl budget that should be going to real products. Unknown paths now get a shell that says `noindex` and claims no canonical at all.

## Two files, one truth

A smaller one, but it's the kind of thing that bites you at 2am.

The project had two `.env` files - one at the repo root, one inside the API - with **identical key sets**. The API read its own; the frontends read the root one. Nobody had noticed, because both worked.

When I finally diffed them properly, they had already drifted on one value. It was harmless that time - a public key the API never used. But the next drift was always going to be `DATABASE_URL`, or the session secret, applied to one file and not the other, failing at an unrelated moment weeks later.

Consolidating to one file meant chasing down every consumer, and the awkward one was Prisma: its env discovery looks in the schema's directory and the working directory, and npm sets the working directory to the workspace. It never walks up to a monorepo root. The answer was a `prisma.config.ts` that names the path explicitly - declaring a config file switches the automatic discovery off, which is the point. One file, named once, with nowhere left for a stale copy to hide.

## Putting it on a real server

And now the part I promised a post ago.

The client's site went live on a VPS - Ubuntu 24.04, six cores, eleven gigabytes of RAM, and nothing on it but the operating system.

```
              the internet
                    |
                    v
         +---------------------+
         |       CADDY         |  <- TLS certificates, automatic
         |  (reverse proxy)    |
         +----+-----------+----+
              |           |
   shaggyscopharmacy.com  |  admin.shaggyscopharmacy.com
              |           |
              v           v
      +--------------+  +--------------+
      |  /var/www/   |  |  /var/www/   |
      |  web (static)|  | admin(static)|
      +--------------+  +--------------+
              |           |
              +-----+-----+
                    |  /api/* and /uploads/*
                    v
            +-----------------+
            |  shaggysco-api  |  <- systemd, restarts on failure
            |  node dist/     |
            +--------+--------+
                     |
                     v
               +------------+
               | PostgreSQL |  <- 127.0.0.1 only, never exposed
               +------------+
```

A few decisions from that day worth writing down.

**The database user owns nothing it doesn't need.** No superuser, no `CREATEDB`, no `CREATEROLE`. It can read and write its own tables and that's the entire list.

**Uploaded product photos live outside the repository.** They're written to a directory beside the checkout, not inside it, because a deploy that replaces the working tree would otherwise delete every photograph the shop had taken.

**The seed refuses to run in production.** The development seed creates a demo owner with a password written in the file - fine for a laptop, catastrophic on a live pharmacy. So it checks, and stops:

```ts
if (process.env['NODE_ENV'] === 'production') {
  throw new Error(
    'Refusing to seed a production database - this creates an account with a known password.',
  );
}
```

But a live shop *does* need two things seeded: the settings row, and one owner account to sign in as. So there's a separate bootstrap script that creates exactly those and nothing else - no demo catalogue, no invented stock. Its password comes from the environment, never from the file, which is what makes the script safe to commit. And it's guarded by a staff count rather than `NODE_ENV`: bootstrapping is something you do once, to an empty shop. A script that mints an owner account from environment variables must not work against a running pharmacy.

**[ Deep dive - for the engineers ]**

The Caddy config has one subtlety I nearly got wrong. Prerendered pages have to win over the SPA fallback, or all that baked-in metadata is thrown away on the way out the door:

```
try_files {path} {path}/index.html /app-shell.html
```

Exact file first. Then the prerendered directory index - `dist/shop/index.html`, `dist/product/<slug>/index.html`. Only then the shell. Falling back too early would serve a client-rendered page to a crawler that can't run JavaScript, which is the exact failure the prerender exists to prevent.


### The deploy script that deployed in the wrong order

The first deploy script did this:

```
pull -> install -> migrate -> BUILD EVERYTHING -> publish -> restart the API
```

Read it again with one fact in mind: **the storefront build asks the live API for the catalogue**, so it can bake each product's price and availability into its page.

The API is restarted at the *end*. So on a cold start - the very first deploy, the one where nothing is running yet - the build asked a service that wasn't there, got nothing, and produced a site with zero product pages. And it didn't fail. It warned, and exited zero.

Same bug as the SEO one, wearing different clothes: a silent degradation in a green build.

```
   pull -> install -> migrate -> build API + admin
                                        |
                                   restart API
                                        |
                              wait for it to answer   <- the new bit
                                        |
                            build storefront (catalogue is live now)
                                        |
                                     publish
```

The `sleep 2` became a retry loop that polls until the API actually responds, because guessing a duration is how this breaks again. And the script now prints the prerendered route and product counts at the end - so the number that silently goes to zero is on screen, where somebody will notice.

## Cutting the background out of a photograph

The last feature, and the one the client will notice most.

The pharmacist photographs stock on the counter with her phone. Which means every product photo has a shop behind it - a blurry till, a shelf, somebody's arm. I'd suggested remove.bg, which works beautifully and has a free tier measured in a handful of images a month.

So: can we run our own?

Yes, and the answer is **rembg** - an open-source tool that runs a segmentation model locally, on the CPU, for free. But the interesting part isn't the tool. It's the trap.

Almost every tutorial recommends the same model: BRIA's **RMBG**. It produces the nicest edges by a distance, it's on Hugging Face, and it's all over the blog posts.

It's licensed **CC BY-NC 4.0**. Non-commercial. A pharmacy selling paracetamol is about as commercial as it gets.

The tool and the model have *different licences*, and that distinction is easy to miss when the install command is one line. rembg itself is MIT. What we actually run is **U²-Net**, which is Apache 2.0 and free to use commercially. Slightly softer edges on hair and fur - and entirely irrelevant here, because our products are cartons and blister packs with hard straight edges. Paying for the fancy model's strengths on photographs that never exercise them would have been an expensive way to break a licence.

**[ Deep dive - for the engineers ]**

It runs as a systemd service bound to `127.0.0.1`, with the model resident in memory so each request doesn't pay the load cost. Two limits, because it shares a box with the API and the database:

```ini
MemoryMax=3G
CPUQuota=400%
```

An inference that grows without bound must not take the shop down to save a photograph.

The client fails soft on every path - not configured, unreachable, too slow, a reply that isn't a PNG all return `null` and keep the original photo. A pharmacist who walked to a shelf, photographed a box and pressed upload should never lose that work because a model was restarting.

And I got the API contract wrong on the first try. I assumed raw bytes; it wants `multipart/form-data`. Because the code fails soft, that mistake wouldn't have crashed anything - **every photo would have quietly kept its background**, with one log line to explain why. I only caught it by testing against the real service before shipping. The model is now pinned explicitly in the request too, so an upgrade can't silently swap in one of the non-commercial ones.


Measured on the actual server: **925ms per photo**, 1.2GB resident, background gone.

There's one more thing worth saying about this feature, and it isn't code. Segmentation is occasionally wrong - a white label against a white worktop, a clipped carton corner. So the original photograph is kept beside the cutout, and there's a button that puts it back. Without that, the recovery path is *walk to the shelf and photograph it again*, which is how a feature stops being used.

## The part software couldn't fix

I'll finish with the most useful thing I learned, which is that I'd been solving the wrong problem.

The client wanted to rank on Google. I built the structured data, the sitemap, the prerendering, the canonical tags - all of it correct, all of it necessary. Then I looked at what actually happens when somebody in Accra searches for her shop.

Above every website link, Google shows a **map with three businesses**. That map isn't fed by her website. It's fed by a Google Business Profile - a free listing, twenty minutes to claim.

And when I searched, there wasn't one listing. There were **three**. Two of them shared a phone number - the same shop, entered twice, splitting its own ranking signals so neither could win. One had the single customer review; the other had the correct category. Neither had the right address, and none of them matched what the website said.

No amount of schema.org markup fixes that. The highest-leverage work available - merging the duplicates, fixing the category, making the address on the listing match the address in the structured data, and asking satisfied customers for reviews - was all owner-side, and none of it was code.

> The best thing I did for that client's search ranking was open a browser and read what Google already thought about her shop.

## What this project actually taught me

The gym taught me to attack my own work. This one taught me something narrower and more uncomfortable:

- **Silence is the expensive failure mode.** The SEO step that skipped, the deploy that built too early, the segment counter that measured characters - every one of them exited zero and looked fine. Loud failures get fixed in an hour. Quiet ones ship.
- **Fail closed, including in build scripts.** A tool that can't do its job should stop, not shrug. "Warn and continue" is how a broken `robots.txt` reaches the internet.
- **Derive, don't store.** The best decision in this codebase was refusing to keep a stock number. Data that's computed can't disagree with itself.
- **Read the licence, not the tutorial.** The most-recommended model would have been a licence violation on a commercial site, and nothing in the install command would have told me.
- **Then go and look at the real world.** Three duplicate map listings outweighed every line of SEO code I wrote. The software was never the bottleneck.

Building for yourself, a bug is a lesson. Building for a shop in Okaishie, a bug is somebody's blood pressure tablets not arriving - or a phone bill three times what it should be, paid by a small business, because I used the wrong currency symbol in a text message.

The site is live. The pharmacist is uploading her catalogue. And somewhere in Accra, a `₵` is not costing anybody money.

Thanks for reading.

`visitor@portfolio:~$ _`
