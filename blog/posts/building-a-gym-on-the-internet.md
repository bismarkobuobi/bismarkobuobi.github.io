# Building a Gym That Lives on the Internet

My last post was a single line of output - proof the blog was alive. This one is the opposite: a whole system that has to stay alive, take people's money without losing a cedi, and not fall over when a student mashes the login button five times.

For the past couple of months I've been building the **University of Ghana Gymnasium** platform - the software that lets students, staff, and the public sign up, pick a membership plan, pay online, and walk into the gym as paying members. It's my final-year project, but I've been treating it like a real product, because that's the only way I learn anything worth writing about.

This post is the story of that build. I've written it for two people at once:

- If you don't code, read the plain-English bits and skip the *Deep dive* boxes. You'll still get the whole picture.
- If you do code, the *Deep dive* boxes are where the fun (and the bugs) live.

Let's go.

## What are we even building?

Strip away the jargon and it's simple. A gym wants to sell memberships online. So the software needs to:

1. Let a person **create an account** (student, staff, or member of the public).
2. Show them **membership plans** - "Student Monthly", "Staff Quarterly", that kind of thing.
3. Take a **payment** by card or mobile money.
4. Flip their membership to **active** the moment the money lands.
5. Give the gym's **admins** a private dashboard to manage all of it.

Sounds like a weekend project. It absolutely is not - and the reasons why are the interesting part.

## The 30,000-foot view

The system is actually **three separate applications** that talk to each other. Keeping them separate is a deliberate choice: the public website and the staff-only admin panel have completely different audiences, risks, and designs, so they get to be different apps.

```
        +-------------+          +-------------+
        |   CLIENT    |          |    ADMIN    |
        |  (members)  |          |   (staff)   |
        | React + Vite|          | React + Vite|
        +------+------+          +------+------+
               |                        |
               |     HTTPS / JSON       |
               +-----------+------------+
                           |
                           v
                 +--------------------+
                 |     THE SERVER     |
                 |  Express + Node    |
                 |  (TypeScript)      |
                 |                    |
                 | auth  plans  subs  |
                 | payments  contact  |
                 +----+-----+-----+---+
                      |     |     |
          +-----------+     |     +-----------+
          v                 v                 v
   +-------------+   +-------------+   +-------------+
   | PostgreSQL  |   |  Paystack   |   |   Email     |
   | (via Prisma)|   | (the money) |   |   (SMTP)    |
   +-------------+   +-------------+   +-------------+
```

- **The client** is what members see - a marketing-style site with plans and a checkout.
- **The admin** is a locked-down dashboard for staff to manage users, plans, payments, and messages.
- **The server** is the brain. Everyone talks to it; it talks to the database, the payment provider, and the email service. Nobody talks to the database directly except the server. That single rule prevents a hundred future headaches.

> The frontends are dumb on purpose. Every decision that matters - can this person do this? is this payment real? - happens on the server, where users can't tamper with it.

The stack, for the curious: **React + Vite + TypeScript + Tailwind** on the frontends, **Express + Prisma + PostgreSQL** on the backend, **Paystack** for payments, **JWT** for auth, plus cron jobs for the background chores.

## The five percent that hides in plain sight

Here's my favourite detail, because it's a business rule disguised as a math problem.

The developers earn a small cut - **5% on top of every plan** - and it's collected automatically at checkout. But here's the trick: **the admin never types that 5%.** They enter the price the *gym* should receive, and the system quietly adds the markup on top. Whatever the admin types is not what the customer pays.

In plain English: admin enters **GHS 100**, the customer sees and pays **GHS 105**. The gym keeps its 100, the developers get 5, and nobody has to do arithmetic in their head.

**[ Deep dive - for the engineers ]**

The whole thing is three tiny pure functions, which made them a joy to test:

```ts
export const DEVELOPER_MARKUP_PERCENTAGE = 5;

// what the customer pays
const calculatePriceWithMarkup = (base: number) =>
  base * (1 + DEVELOPER_MARKUP_PERCENTAGE / 100);

// working backwards from a marked-up total
const calculateBasePrice = (total: number) =>
  total / (1 + DEVELOPER_MARKUP_PERCENTAGE / 100);
```

The actual money split is handled by **Paystack subaccounts** - the payment lands, the platform routes the gym's share to their account and keeps the developer share, all in one transaction. The server never touches the money; it just tells Paystack how to divide it.


The bug hiding here bit me later. When you *edit* a plan, the form used to pre-fill the price with the *already-marked-up* value... and then add 5% again on save. Edit a plan three times and its price quietly inflates. Compound interest, but as a bug. The fix was one line - pre-fill the base price - but finding it meant actually reading the code like an attacker would. Which brings me to the best week of the project.

## The day I hacked my own app

At some point I stopped adding features and asked a scarier question: *if I were malicious, could I break in?*

Turns out: easily. I found a stack of problems, but two of them made my stomach drop.

**Problem one: anyone could read everyone's data.** The admin routes were "protected" - you needed to be logged in. But logged in *as anyone*. A regular student's login token was accepted by the admin endpoints, because the code checked "are you logged in?" and forgot to check "are you actually an admin?" So any member could have listed every user's personal details.

**Problem two: admins and users were signed with the same secret key.** In auth, a token is trusted because it's signed with a secret only the server knows. But I'd used the *same* secret for member tokens and admin tokens. That means a member's token was, cryptographically, indistinguishable from an admin's.

> This is called **broken access control**, and it's the number one item on the OWASP Top 10 for a reason. It's not exotic. It's a forgotten `if` statement.

The fix was a proper separation of powers:

**[ Deep dive - for the engineers ]**

- Admin tokens now get their **own signing secret**, completely separate from member tokens.
- The admin middleware verifies against that secret **and** asserts the role:

```ts
export const verifyAdminAccessToken = (token: string): AdminJwtPayload => {
  const decoded = jwt.verify(token, JWT_ADMIN_SECRET) as AdminJwtPayload;
  if (decoded.role !== 'ADMIN') throw new Error('Not an admin token');
  return decoded;
};
```

- Every `/api/admin/*` route runs through admin-only middleware.
- And I wrote tests that specifically try the attack - "a member token must be rejected here" - so the hole can never quietly reopen.


I also found a password-reset endpoint that helpfully returned the reset token *in the HTTP response* (so much for "reset by email only"), a payment webhook that verified signatures against the wrong bytes, and no rate limiting anywhere. We closed all of them. Writing tests that act like an attacker turned out to be the most satisfying code I wrote all month.

## Cookies, but not the fun kind

The next security upgrade was about *where* we keep your login.

Originally, both apps stored your login tokens in `localStorage` - a little box in the browser that any JavaScript on the page can read. That's convenient, and it's also exactly what an attacker's injected script would go looking for.

So we moved to the pattern the security people actually recommend:

```
   LOGIN
     |
     v
  +--------------------------------------------+
  |  SERVER responds with:                     |
  |                                            |
  |   access token  -->  held in memory only   |
  |                      (gone on refresh)     |
  |                                            |
  |   refresh token -->  httpOnly cookie       |
  |                      (JavaScript CANNOT    |
  |                       read it, ever)       |
  +--------------------------------------------+
```

The **access token** (short-lived, ~15 min) lives in a plain JavaScript variable - never written to disk, wiped the instant you close the tab. The **refresh token** (long-lived) lives in an `httpOnly` cookie, which is a cookie the browser will send to the server automatically but hides from JavaScript entirely.

The payoff: even if someone managed to inject a malicious script, there's no long-lived credential lying around for it to steal. The worst it could grab is a token that dies in fifteen minutes.

## The design system that was secretly invisible

Now for a plot twist that had nothing to do with security and everything to do with humility.

The client app looked... flat. Cards had no depth, sections had no separation, the brand colours barely showed. I assumed it just needed polish. Then I opened the compiled CSS and realised something embarrassing: **half the styling wasn't rendering at all.**

The project used design tokens - named colours like `primary`, `muted`, `card` - the way every modern UI is built. But the newest version of Tailwind needs you to *register* those names before it will generate any CSS for them. That registration was missing. So classes like `bg-primary` and `text-muted-foreground` were being written all over the codebase and silently producing... nothing. The app was leaning entirely on a handful of hard-coded colours.

**[ Deep dive - for the engineers ]**

The fix was to actually wire the tokens into Tailwind's theme, and while I was there, align everything to the real University of Ghana palette - **navy `#002147`** and an **antique gold `#B99D64`**:

```css
@theme inline {
  --color-primary: hsl(var(--primary));       /* UG navy */
  --color-secondary: hsl(var(--secondary));   /* UG gold */
  --color-muted-foreground: hsl(var(--muted-foreground));
  /* ...and the rest of the tokens */
}
```

One block of CSS, and suddenly the entire app came alive - cards had surfaces, sections had rhythm, the navy and gold actually showed up. I hadn't written a broken feature. I'd written an invisible one.


> Lesson I keep re-learning: when something looks wrong, don't add more. Go find out why. The bug is usually smaller and dumber than the fix you were about to build.

## The stampede at the login gate

This story is relatable, because a user (me) noticed the app "feeling off" and the logs told the real tale.

On every page load, the dashboard fires three requests at once - your profile, your subscriptions, your recent payments. But remember: the access token lives in memory, and memory is wiped on reload. So all three requests arrived with no token, all three got rejected at the same instant, and all three independently went "let me refresh my login!" - firing **three refresh requests in a row**.

Then it got worse. I'd added rate limiting to stop brute-force attacks, but I'd accidentally pointed the *strict* limiter at the refresh and profile endpoints too. So the app was DDoS-ing itself into its own rate limit.

Two fixes:

**[ Deep dive - for the engineers ]**

**1. Coalesce the refreshes.** If a refresh is already in flight, everyone else waits for that same one instead of starting their own:

```ts
let refreshPromise: Promise<string> | null = null;

const requestRefresh = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => res.data.data.accessToken)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;   // three callers, one network call
};
```

**2. Point the strict limiter only at the things that get attacked** - login, signup, password reset - and let the routine stuff (refresh, profile, logout) breathe. Plus `skipSuccessfulRequests: true`, so only *failed* logins count toward the limit. You can never get locked out by succeeding.


Three requests became one. The self-inflicted rate limit vanished. And the whole episode was a neat reminder that a "frontend" bug and a "backend" bug are often the same bug shaking hands in the middle.

## How do you prove you're actually a student?

This is the problem that kept me up the longest, because it isn't really a coding problem. It's a trust problem.

Students pay less than staff, who pay less than the public. So the whole business depends on one question: **when someone claims to be a student, how do you know they aren't just a member of the public who typed eight random digits into the "student ID" box?**

The obvious answer is "check the ID against the university's student database." The problem: I'm a student. No IT directorate is going to hand a final-year student a copy of everyone's records so his gym app can look them up. And honestly, they shouldn't.

So I had to reframe it. You can't verify identity out of thin air - you have to **anchor trust to something that's already trusted**. And there was one sitting right in front of me: the university already runs an email system, and only real students get an `@st.ug.edu.gh` address. Only real staff get an `@ug.edu.gh` one. The university has already done the identity check for me. I just have to lean on it.

That turns one hard question into two easy ones:

1. Does the email address match the role's domain? (A cheap string check.)
2. Do they actually control that inbox? (Send a verification link and see if they click it.)

A public user can't receive mail at `@st.ug.edu.gh`, so they can never finish step 2 - which means they can never buy a student plan. No student database required.

```
                          Someone signs up
                                 |
              +------------------+------------------+
              |                  |                  |
           PUBLIC             STUDENT             STAFF
              |                  |                  |
         any email         email ends in      email ends in
      (auto-verified)     @st.ug.edu.gh?      @ug.edu.gh?
              |               /      \            /      \
              |             No        Yes       No        Yes
              |             |          |         |          |
              |         REJECTED    created   REJECTED   created
              |        at signup  (unverified) at signup (unverified)
              |                        |                    |
              |                        +---------+----------+
              |                                  |
              |                     verification link emailed
              |                                  |
              |                            link clicked?
              |                              /        \
              |                            No          Yes
              |                            |            |
              |                   held on "verify    VERIFIED
              |                   email" page;          |
              |                   checkout blocked      |
              |                                         |
              +---------------------+-------------------+
                                    |
                            Can buy their plan
```

The key move is that an unverified student/staff account is a **second-class citizen** until they click the link. They can log in, but they're bounced to a "please verify your email" screen and cannot reach the dashboard or the checkout. Here's the sequence:

```
  Student           Client            Server            Email
    |                 |                 |                 |
    | sign up         |                 |                 |
    |  @st.ug.edu.gh  |                 |                 |
    |---------------->| POST /signup    |                 |
    |                 |---------------->|                 |
    |                 |                 | domain matches  |
    |                 |                 | the role?       |
    |                 |                 |---------------->| send link
    |                 | created         |                 | (24h token)
    |                 | (unverified)    |                 |
    |                 |<----------------|                 |
    | "verify your email to continue"   |                 |
    |<----------------|                 |                 |
    |                                                     |
    |== dashboard + checkout BLOCKED until verified ======|
    |                                                     |
    | click the link in the email ----------------------->
    |                 | POST /auth/verify-email           |
    |----------------------------------->                 |
    |                 |                 | validate token, |
    |                 |                 | set verified    |
    | verified - on to the dashboard    |                 |
    |<-----------------------------------                 |
```

**[ Deep dive - for the engineers ]**

Two things worth calling out. First, the domain check has a sharp edge: a student address like `ama@st.ug.edu.gh` also *ends with* `ug.edu.gh`, so a naive staff check would happily accept students as staff. The staff rule has to explicitly exclude the student subdomain:

```ts
const isStaffEmail = (email: string) => {
  const e = email.trim().toLowerCase();
  return e.endsWith('@ug.edu.gh') && !e.endsWith('@st.ug.edu.gh');
};
```

Second, "block the checkout" is enforced in **two** places, on purpose. The frontend redirects unverified users away from the dashboard (good UX), and the server independently refuses to create a subscription for them (real security). A determined user can bypass the browser; they can't bypass the server:

```ts
if ((user.role === 'STUDENT' || user.role === 'STAFF') && !user.isEmailVerified) {
  return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', /* ... */ });
}
```


The part I'm proud of isn't the code - it's the reframing. "I can't get the database" felt like a dead end for weeks. The unlock was realising I didn't need the database; I needed something the university had *already* verified, and their email system was exactly that.

## The money path, and the email that came twice

Payments look simple from the outside: click, pay, done. Under the hood, a single successful payment actually gets reported to my server **twice**, by two different roads, and getting that right is most of the work.

```
  Member          Client           Server           Paystack
    |               |                |                |
    | choose plan   |                |                |
    |-------------->| POST /subscriptions             |
    |               |--------------->| create PENDING |
    |               |                | sub + txn (DB) |
    |               | POST /payments/initialize       |
    |               |--------------->| mint a FRESH   |
    |               |                | reference      |
    |               |                |--------------->| initialize
    |               |                |                | base + 5% + fee
    |               | redirect to Paystack page       |
    |               |<------------------------------- |
    | pay by card / mobile money                      |
    |----------------------------------------------->|
    |                                                 |
    |   the SAME success now arrives by TWO roads:    |
    |     (a) browser  -> GET  /payments/verify/:ref  |
    |     (b) webhook  -> POST /webhook   (signed)    |
    |                                                 |
    |               |                | first road to  |
    |               |                | arrive wins:   |
    |               |                | mark COMPLETED |
    |               |                | once (atomic)  |
    | one confirmation email (never two)              |
    |<------------------------------ |                |
```

See the `par` block? Both roads - the browser redirect *and* Paystack's server-to-server webhook - report the same success, and they can arrive in either order or at the same moment. My first version had each road independently mark the payment complete and fire off a confirmation email. So people got charged once and thanked twice.

**[ Deep dive - for the engineers ]**

The fix is to make completion idempotent: only the *first* road to arrive gets to do the work. A conditional update does this atomically - it only flips the row if it hasn't already been flipped, and only sends the email if it actually changed something:

```ts
const updated = await tx.transaction.updateMany({
  where: { id, paymentStatus: { not: 'COMPLETED' } },
  data:  { paymentStatus: 'COMPLETED', paidAt: new Date() },
});
if (updated.count === 0) return; // someone already handled it - stay quiet
```


There's a second money bug worth telling, because the error message was so blunt it was almost funny. When someone abandoned a payment halfway and later hit "retry" from their dashboard, Paystack rejected it: **`Duplicate Transaction Reference`**. It turns out you can't re-use a payment reference Paystack has already seen - the abandoned attempt had "claimed" it. The fix was to mint a **fresh reference on every attempt** and store it on the transaction, so verification and the webhook still find the right record by looking it up on the new reference. Retry works; the record isn't duplicated; the ledger stays clean.

## The membership that starts in the future

Renewals sound trivial until you think about *when* the new plan should start. If your current membership still has three days left and you renew today, you shouldn't lose those three days. The new one should begin the moment the old one ends - not a second sooner, not a second later.

So a subscription now has a state I didn't have before: **SCHEDULED**. It's fully paid for, but dormant, waiting in the wings.

```
   Current plan (ACTIVE) ----------------|
                                         | ends here
   Renewal (SCHEDULED) .................  |============>  becomes ACTIVE
                                         ^
                              starts exactly when the old one ends
```

When you renew inside the final stretch, the payment completes and - because you still have an active plan - the server files the new one as SCHEDULED with a start date pinned to the current plan's end date. Your dashboard shows both: your current membership (winding down) and a clearly-labelled **Upcoming** one (ready to go). Then the nightly job does the hand-off: it expires the finished plan first, then promotes the scheduled one to active. No gap, no double-charge, no overlap.

**[ Deep dive - for the engineers ]**

The nice property here is that nothing is decided by a flag set at purchase time - it's decided by the state of the world *when the payment lands*. If you have a live subscription, the new one is scheduled; if you don't, it activates immediately. Same code path, two outcomes, no special "is this a renewal?" boolean to keep in sync:

```ts
const current = await tx.subscription.findFirst({
  where: { userId, subscriptionStatus: 'ACTIVE', endDate: { gt: now } },
});
const startDate = current?.endDate ?? now;                 // begins when the old one ends
const status    = current ? 'SCHEDULED' : 'ACTIVE';        // dormant, or live now
```


## The reminder that never fired

Last one, and it's my favourite kind of bug: the code was "working" and doing exactly the wrong thing.

The gym sends two automated emails - a "your membership expires in 3 days" heads-up, and an "it's expired" notice - from a job that runs every night at midnight. To test it, I'd shorten a subscription's end date and wait. Nothing. I'd try again. Nothing.

The warning had an anti-spam guard: don't warn someone if we've updated their subscription recently. Reasonable idea, terrible implementation - it used the row's generic "last updated" timestamp as the "did we already warn them?" flag. And guess what editing the end date to test it did? It updated the row. Which the guard read as "we just contacted them, leave them alone." **The act of testing the feature was the exact thing that suppressed it.**

The fix was to stop overloading one timestamp with two meanings: a dedicated `expiryWarningSentAt` column that means one thing and only changes when a warning actually goes out. Obvious in hindsight. They always are.

> The theme of this whole project, if it has one: the expensive bugs weren't exotic. They were ordinary things - a reused timestamp, a reused reference, a forgotten `if` - quietly meaning something other than what I assumed.

While I was in there, I also rebuilt every email. They'd been cheerful walls of emojis; a gym at a national university should sound like one. Now they're clean, on-brand (that navy and gold again), and boringly professional - which, for a receipt, is exactly right.

## What this project actually taught me

I could list the stack again, but the real lessons weren't technical:

- **The boring layers carry the weight.** Auth, money, and access control are unglamorous, and they're exactly where a real product lives or dies.
- **Attack your own work.** The hour I spent trying to break in was worth more than the week I spent building features.
- **Reframe before you build.** The identity problem looked impossible until I stopped trying to get the database and started trusting the email system the university already ran.
- **Read before you write.** My favourite fixes - the invisible CSS, the price-inflation bug, the self-suppressing reminder - were all one-liners hiding under a wrong assumption.
- **Systems are conversations.** Frontend, backend, database, payment provider - the interesting bugs happen in the gaps between them, not inside any one box.

The gym is made of iron and sweat. Its software is made of tokens, cookies, and a payment split that adds up to exactly the right number. Getting them to agree on who you are, what you owe, and whether you're allowed in - that's the whole job. And I loved every broken build of it.

There's still more to write about - the admin experience, and the day I finally put this thing on a real server for real people to use. But that's for the next line of output.

Thanks for reading.

`visitor@portfolio:~$ _`
