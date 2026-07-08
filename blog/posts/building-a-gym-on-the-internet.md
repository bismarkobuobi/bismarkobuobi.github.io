# Building a Gym That Lives on the Internet

My last post was a single line of output - proof the blog was alive. This one is the opposite: a whole system that has to stay alive, take people's money without losing a cedi, and not fall over when a student mashes the login button five times.

For the past few weeks I've been building the **University of Ghana Gymnasium** platform - the software that lets students, staff, and the public sign up, pick a membership plan, pay online, and walk into the gym as paying members. It's my final-year project, but I've been treating it like a real product, because that's the only way I learn anything worth writing about.

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

**[ Deep dive — for the engineers ]**

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

**[ Deep dive — for the engineers ]**

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

**[ Deep dive — for the engineers ]**

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

The last story is the most recent, and the most relatable, because a user (me) noticed the app "feeling off" and the logs told the real tale.

On every page load, the dashboard fires three requests at once - your profile, your subscriptions, your recent payments. But remember: the access token lives in memory, and memory is wiped on reload. So all three requests arrived with no token, all three got rejected at the same instant, and all three independently went "let me refresh my login!" - firing **three refresh requests in a row**.

Then it got worse. I'd added rate limiting to stop brute-force attacks, but I'd accidentally pointed the *strict* limiter at the refresh and profile endpoints too. So the app was DDoS-ing itself into its own rate limit.

Two fixes:

**[ Deep dive — for the engineers ]**

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

## What this project actually taught me

I could list the stack again, but the real lessons weren't technical:

- **The boring layers carry the weight.** Auth, money, and access control are unglamorous, and they're exactly where a real product lives or dies.
- **Attack your own work.** The hour I spent trying to break in was worth more than the week I spent building features.
- **Read before you write.** My two favourite fixes - the invisible CSS and the price-inflation bug - were both one-liners hiding under a wrong assumption.
- **Systems are conversations.** Frontend, backend, database, payment provider - the interesting bugs happen in the gaps between them, not inside any one box.

The gym is made of iron and sweat. Its software is made of tokens, cookies, and a payment split that adds up to exactly the right number. Getting them to agree on who you are, what you owe, and whether you're allowed in - that's the whole job. And I loved every broken build of it.

There's a lot more coming - I've still got background jobs, email pipelines, and a whole admin experience I didn't get to here. But that's for the next line of output.

Thanks for reading.

`visitor@portfolio:~$ _`
