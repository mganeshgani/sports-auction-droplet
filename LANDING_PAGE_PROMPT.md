# SPORTS AUCTION LANDING PAGE — ULTRA PREMIUM BUILD PROMPT
### For Claude Opus 4.6 · VS Code Agent Mode · React + Tailwind

---

## YOUR ROLE

You are a world-class UI/UX designer and frontend engineer.
You are building a landing page that looks like it was designed by a ₹50 lakh agency.
Every pixel must be intentional. Every animation must feel smooth and purposeful.
This is NOT a generic template. This must feel like a premium sports product.

---

## ABOUT THE PRODUCT

**Product Name:** BidSport (or read from existing branding in the codebase)
**Website:** sportsauction.me
**What it does:** Online player auction software for sports tournaments — cricket, football, kabaddi, volleyball etc.
**Target customers:** Schools, colleges, corporate teams, sports clubs, tournament organizers across India
**Unique selling point:** The ONLY auction platform with a custom form builder — collect any player data you want
**Competitors:** BidAthlete (₹100/team), SuperPlayerAuction (₹2000-4000), ThePlayerAuction (₹3000-8000)
**Our pricing advantage:** Better UI, more features, competitive pricing

---

## DESIGN DIRECTION — NON-NEGOTIABLE

**Theme:** Ultra-premium dark theme
- Background: Deep dark `#080C14` (not pure black — slightly blue-tinted dark)
- Primary accent: Electric gold `#F5B800` — used for CTAs, highlights, important numbers
- Secondary accent: Bright cyan `#00D4FF` — used for feature highlights, glows
- Text primary: `#FFFFFF`
- Text secondary: `#8892A4`
- Card backgrounds: `#0D1420` with `#1A2235` borders
- Success green: `#00E676`

**Typography:**
- Display/Hero font: `Clash Display` or `Cabinet Grotesk` (import from Google Fonts or Fontshare)
- Body font: `DM Sans` or `Plus Jakarta Sans`
- Numbers/Stats: `Bebas Neue` or `Oswald` — large, bold, impactful
- NO Inter, NO Roboto, NO Arial

**Visual Style:**
- Grain texture overlay on hero section (subtle noise for premium feel)
- Glowing orb effects behind key sections (blurred colored circles)
- Glassmorphism cards (backdrop-blur with semi-transparent backgrounds)
- Animated gradient borders on pricing cards
- Smooth scroll with parallax effects
- Staggered fade-in animations as user scrolls
- Sports-themed particle effects or animated cricket/football elements in hero

---

## FILE STRUCTURE

Create the landing page as a SEPARATE page in the existing React project.

Create these files:
```
frontend/src/pages/LandingPage/
├── index.tsx                    ← Main landing page component
├── LandingPage.module.css       ← Custom CSS animations and effects
└── components/
    ├── Navbar.tsx               ← Sticky navigation
    ├── Hero.tsx                 ← Hero section
    ├── StatsBar.tsx             ← Animated stats
    ├── Features.tsx             ← Features showcase
    ├── HowItWorks.tsx           ← Step by step process
    ├── Pricing.tsx              ← Pricing cards
    ├── Testimonials.tsx         ← Social proof
    ├── FAQ.tsx                  ← Frequently asked questions
    └── Footer.tsx               ← Footer
```

Add the route in `frontend/src/App.tsx`:
```tsx
<Route path="/" element={<LandingPage />} />
```

Make sure the existing `/login`, `/dashboard` etc. routes still work.

---

## SECTION 1 — NAVBAR

**Sticky navbar that changes on scroll:**
- Before scroll: Transparent background
- After 50px scroll: Dark glass background with backdrop blur + subtle border bottom

**Left:** Logo (use existing app logo or text "BidSport" in gold)

**Center links:**
- Features
- How It Works
- Pricing
- FAQ

**Right:**
- "Login" button — ghost style (outlined)
- "Start Free Trial" button — gold filled, slight glow

**Mobile:** Hamburger menu with smooth slide-down drawer

---

## SECTION 2 — HERO

This is the most important section. Make it UNFORGETTABLE.

**Layout:**
- Full viewport height (100vh)
- Centered content with large typography
- Animated background

**Background:**
- Deep dark base color `#080C14`
- Two large blurred orbs:
  - Gold orb: top-left area, `rgba(245, 184, 0, 0.15)`, blur 120px, 600px diameter
  - Cyan orb: bottom-right area, `rgba(0, 212, 255, 0.12)`, blur 120px, 500px diameter
- Subtle grain texture overlay (use CSS noise or SVG filter)
- Optional: faint grid lines pattern

**Content (centered):**

Badge above headline:
```
⚡ India's #1 Sports Auction Platform
```
Small pill badge with gold border and glow

Main headline (massive, 72-96px):
```
Conduct Your Dream
Sports Auction
In Minutes
```
"Sports Auction" in gold color with a subtle text glow

Sub-headline (20px, secondary color):
```
The professional player auction software used by 500+ tournaments.
Cricket, Football, Kabaddi, Volleyball — any sport, any scale.
```

Two CTA buttons side by side:
- Primary: "Start Free — No Card Needed" — large gold button with hover glow animation
- Secondary: "Watch Demo →" — ghost button with play icon

Trust indicators below CTAs:
```
✓ Free for first 2 teams   ✓ No credit card   ✓ Setup in 5 minutes
```

**Below the fold:** Mockup/screenshot of the auction dashboard
- Use a browser frame mockup with a screenshot or illustrated dashboard
- Add a subtle floating animation (up and down, 6s loop)
- Glow effect behind the mockup image

---

## SECTION 3 — STATS BAR

Full-width dark card section with animated counting numbers.

**4 stats displayed horizontally:**

| Stat | Number | Label |
|---|---|---|
| Auctions | 500+ | Auctions Completed |
| Players | 50,000+ | Players Auctioned |
| Teams | 5,000+ | Teams Created |
| Sports | 10+ | Sports Supported |

**Implementation:**
- Use `IntersectionObserver` to trigger counting animation when section enters viewport
- Numbers count up from 0 to final value over 2 seconds with easing
- Use `Bebas Neue` font for the numbers — large, bold, gold colored
- Dividers between stats
- Subtle background: slightly lighter than page background

---

## SECTION 4 — FEATURES

**Headline:**
```
Everything You Need
To Run a Perfect Auction
```

**Layout:** 
- 2x3 grid on desktop, 1 column on mobile
- Each feature is a glassmorphism card

**6 Feature Cards:**

1. **🎯 Custom Form Builder**
   "Build your own player registration form. Add any fields you need — no technical knowledge required."
   *This is your UNIQUE feature — make this card slightly larger or highlighted*

2. **⚡ Real-Time Bidding**
   "Live auction with instant updates. Every bid appears on all screens simultaneously."

3. **📱 Works on Any Device**
   "Auctioneer on laptop, team owners on mobile, audience on big screen. All in sync."

4. **🏏 Any Sport**
   "Cricket, Football, Kabaddi, Volleyball, Basketball and more. Fully customizable for any sport."

5. **📊 Instant Results**
   "Automatic results page with team summaries, spending breakdown, and unsold player list."

6. **🖼️ Player Photos**
   "Players register with photos. Beautiful player cards displayed during auction."

**Card Design:**
- Glass effect: `background: rgba(13, 20, 32, 0.8)`, `backdrop-filter: blur(10px)`
- Border: `1px solid rgba(255,255,255,0.08)`
- Hover: border glows with cyan color, slight lift (translateY -4px)
- Icon: Large emoji or SVG icon in a small colored circle
- Transition: 300ms ease

**The custom form builder card should be special:**
- Slightly larger
- Gold accent border
- "⭐ UNIQUE FEATURE" badge in top right corner

---

## SECTION 5 — HOW IT WORKS

**Headline:**
```
From Zero to Live Auction
In 4 Simple Steps
```

**Layout:** Horizontal steps on desktop, vertical on mobile
Connected by a dashed line between steps

**4 Steps:**

**Step 1 — Sign Up**
Icon: 🚀
"Create your free account in 30 seconds. No credit card needed."

**Step 2 — Build Your Form**
Icon: 📋
"Use our drag-and-drop form builder to create your player registration form."

**Step 3 — Register Players & Teams**
Icon: 👥
"Share the registration link. Players sign up themselves — you just verify."

**Step 4 — Conduct Auction**
Icon: 🎤
"Go live. Place bids, sell players, see real-time results on any screen."

**Design:**
- Step number in large gold `Bebas Neue` font (01, 02, 03, 04)
- Dashed connector line between steps
- Subtle animation: steps fade in one by one as user scrolls

---

## SECTION 6 — PRICING (MOST IMPORTANT SECTION)

**Headline:**
```
Simple, Transparent Pricing
Pay Per Auction — No Hidden Fees
```

Sub-headline:
```
Cheaper than competitors. More features than anyone else.
```

**4 Pricing Cards:**

### FREE TRIAL
- Price: ₹0
- Badge: "START HERE"
- Color: Default dark card
- Features:
  - ✓ Up to 2 teams
  - ✓ Up to 20 players
  - ✗ Player photos (greyed out)
  - ✗ Custom form builder (greyed out)
  - ✗ Export results (greyed out)
  - ✓ Real-time auction
- CTA: "Start Free" (outlined button)

### STARTER — ₹2000/auction
- Badge: "POPULAR"
- Color: Subtle gold border glow
- Features:
  - ✓ Up to 8 teams
  - ✓ Up to 100 players
  - ✓ Player photo uploads
  - ✓ Custom form builder
  - ✓ Export results (PDF/Excel)
  - ✓ 30 days access
  - ✓ Email support
- CTA: "Buy Starter" (gold filled button)

### PRO — 4000/auction
- Badge: "⭐ BEST VALUE" 
- Color: HIGHLIGHTED — slightly larger, gold gradient border, glow effect
- This is the FEATURED card — make it stand out
- Features:
  - ✓ Up to 20 teams
  - ✓ Up to 500 players
  - ✓ Player photo uploads
  - ✓ Custom form builder
  - ✓ Custom branding (your logo)
  - ✓ Export PDF + Excel
  - ✓ 60 days access
  - ✓ Priority WhatsApp support
- CTA: "Buy Pro" (large gold button with glow)
- Show: "Save ₹500 vs competitors" in small text

### UNLIMITED — ₹6000/auction
- Badge: "POWER USER"
- Color: Cyan accent border
- Features:
  - ✓ Unlimited teams
  - ✓ Unlimited players
  - ✓ Everything in Pro
  - ✓ Multiple auctions
  - ✓ 90 days access
  - ✓ Phone support during live auction
  - ✓ Dedicated setup assistance
- CTA: "Buy Unlimited" (cyan button)

**Pricing card design details:**
- Animated gradient border on the PRO card (border rotates/cycles colors)
- Hover effect: cards lift slightly with enhanced glow
- Price displayed large in `Bebas Neue` font
- Strikethrough competitor price comparison on Pro: "Competitors charge ₹5,000+"
- Annual billing toggle (optional): "Pay for 3 auctions, get 1 free"

**Below pricing cards:**
```
🔒 Secure payment via Razorpay  ·  ✓ Instant access after payment  ·  📞 Support: +91 XXXXXXXXXX
```

---

## SECTION 7 — COMPETITOR COMPARISON TABLE

Show WHY you are better than competitors.

**Headline:**
```
Why Choose BidSport?
```

**Comparison table:**

| Feature | BidSport | BidAthlete | SuperPlayerAuction | ThePlayerAuction |
|---|---|---|---|---|
| Custom Form Builder | ✅ | ❌ | ❌ | ❌ |
| Player Photos | ✅ | ✅ | ✅ | ✅ |
| Real-time Updates | ✅ | ✅ | ✅ | ✅ |
| Modern UI | ✅ | ❌ | ❌ | ❌ |
| Price (10 teams) | ₹999 | ₹800 | ₹4,000 | ₹5,000 |
| Setup Time | 5 min | 15 min | 30 min | 30 min |
| Mobile Friendly | ✅ | ✅ | ✅ | ⚠️ |

**Design:**
- BidSport column highlighted in gold
- ✅ in green, ❌ in red/grey, ⚠️ in amber
- "BidSport" column header has gold background

---

## SECTION 8 — SOCIAL PROOF / TESTIMONIALS

**Headline:**
```
Trusted by Tournament Organizers
Across India
```

**3 testimonial cards in a row (or auto-scrolling carousel):**

Card 1:
```
"We conducted our annual college cricket auction with 12 teams 
and 200+ players. The platform was flawless. Real-time updates 
worked perfectly on the big screen."

— Rahul Sharma
Sports Secretary, Engineering College, Bangalore
⭐⭐⭐⭐⭐
```

Card 2:
```
"The custom form builder is a game changer. We collect batting 
style, bowling style, and previous tournament stats — none of 
the other platforms let us do this."

— Priya Menon  
Tournament Organizer, Mumbai Corporate League
⭐⭐⭐⭐⭐
```

Card 3:
```
"Set up our entire auction in under an hour. Players registered 
themselves using the link. Everything worked smoothly on auction day."

— Mohammed Faiz
DACA Sports Club, Hyderabad
⭐⭐⭐⭐⭐
```

**Design:**
- Glass cards with subtle border
- Quote mark icon (large, gold, semi-transparent) in top left
- Avatar circle with initials (no real photos needed)
- Star rating in gold

---

## SECTION 9 — FAQ

**Headline:**
```
Frequently Asked Questions
```

**10 FAQ items (accordion style — click to expand):**

1. **Is there a free trial?**
   Yes! You can conduct a free auction with up to 2 teams and 20 players. No credit card required.

2. **How does payment work?**
   We use Razorpay — India's most trusted payment gateway. Pay via UPI, credit/debit card, or net banking. You get instant access after payment.

3. **Can I conduct multiple auctions after paying?**
   Each payment is for one auction. The Unlimited plan supports multiple auctions within the access period.

4. **What sports are supported?**
   Any sport! Cricket, Football, Kabaddi, Volleyball, Basketball, Hockey — the platform is fully customizable.

5. **What is the custom form builder?**
   It lets you create your own player registration form with any fields you want — no technical knowledge needed. No other platform offers this.

6. **How many people can watch the auction live?**
   Unlimited viewers. Share the live screen link and anyone can watch in real-time.

7. **Can team owners bid from their phones?**
   Yes! Team owners get their own bidding panel accessible from any device.

8. **What happens after my access expires?**
   Your data is saved. You can export all results before expiry. To conduct another auction, simply purchase a new plan.

9. **Do you provide support during the auction?**
   Yes! WhatsApp and email support for all plans. Pro and Unlimited plans get priority support. Unlimited plan includes phone support during live auction.

10. **Can I get a refund?**
    If you face a technical issue on our end that prevents your auction, we offer a full refund. Contact us within 24 hours.

**Design:**
- Each FAQ is a card that expands with smooth animation
- Plus/minus icon that rotates on open
- Gold highlight on the open item's left border

---

## SECTION 10 — FINAL CTA BANNER

Full-width section with strong call to action.

**Background:** 
- Gold gradient with dark overlay OR dark with gold glowing orb in center

**Content:**
```
Ready to Conduct Your Dream Auction?

Start free today. No credit card. No setup fees.
Join 500+ tournament organizers who trust BidSport.

[Start Free Trial]    [Contact Us on WhatsApp]
```

WhatsApp button links to: `https://wa.me/91XXXXXXXXXX`

---

## SECTION 11 — FOOTER

**4 columns:**

Column 1 — Brand:
- Logo + tagline
- "India's #1 Sports Auction Platform"
- Social links (if any)

Column 2 — Product:
- Features
- How It Works
- Pricing
- Demo

Column 3 — Support:
- Contact Us
- WhatsApp Support
- Email Support
- FAQ

Column 4 — Legal:
- Privacy Policy
- Terms of Service
- Refund Policy

**Bottom bar:**
```
© 2025 BidSport. All rights reserved. | Made with ❤️ in India
```

---

## ANIMATIONS & INTERACTIONS

Implement ALL of these:

### Page Load
- Navbar slides down from top (0.3s)
- Hero badge fades in (0.4s delay)
- Hero headline animates in word by word (staggered, 0.5s-1s)
- Hero sub-headline fades in (1.2s delay)
- Hero CTAs slide up (1.5s delay)
- Hero mockup floats up (1.8s delay)

### Scroll Animations
Use `IntersectionObserver` for all scroll-triggered animations:
- Stats count up when stats bar enters viewport
- Feature cards fade + slide up with stagger (50ms between each)
- Pricing cards zoom in slightly with stagger
- Testimonials slide in from sides

### Hover Effects
- All buttons: slight scale up (1.02) + glow intensifies
- Feature cards: lift + border glow
- Pricing cards: lift + enhanced glow + background brightens slightly
- Nav links: underline slides in from left
- CTA buttons: shimmer/shine animation sweeps across

### Background
- Gold orb and cyan orb should very slowly drift (10-15s loop, small movement)
- This gives the hero a "living" feeling

---

## TECHNICAL REQUIREMENTS

1. **React + TypeScript** — match the existing codebase
2. **Tailwind CSS** — use existing Tailwind setup, extend config if needed
3. **Framer Motion** — already installed, use it for all animations
4. **Google Fonts** — add chosen fonts to `public/index.html`
5. **Fully responsive** — test at 375px (mobile), 768px (tablet), 1440px (desktop)
6. **Performance** — lazy load images, use `will-change` sparingly
7. **Smooth scroll** — `scroll-behavior: smooth` on html element
8. **No external UI libraries** — build everything custom with Tailwind + Framer Motion

---

## ROUTING

The landing page should be at `/` (root route).

If the user is already logged in and visits `/`, redirect them to `/dashboard`.

Add to `frontend/src/App.tsx`:
```tsx
import LandingPage from './pages/LandingPage';

// Public route - redirect to dashboard if logged in
<Route path="/" element={
  isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />
} />
```

All existing routes (`/login`, `/register`, `/dashboard`, etc.) must continue working unchanged.

---

## WHAT TO DO AFTER BUILDING

1. Check the page looks perfect at all screen sizes
2. Check all animations work smoothly (no jank)
3. Check all links work (pricing CTAs, nav links, footer links)
4. Check the page loads fast (no unnecessary large imports)

6. Tell me which files were created/modified

---

## IMPORTANT RULES

- DO NOT use any template or copy from other sites
- DO NOT use generic purple gradients or typical "AI website" aesthetics  
- DO NOT use Inter or Roboto fonts
- DO NOT use flat/boring design — this must feel PREMIUM and SPORTS-THEMED
- DO NOT break any existing pages or routes
- The gold + dark color scheme must be consistent throughout
- Every section must have proper spacing — generous padding
- Mobile must look as good as desktop — not an afterthought
- The pricing section must be the most polished section on the page
