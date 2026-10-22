# OrbiFlick: Release Plan for the App Store and Google Play

*A practical, step-by-step plan for a solo creator on a small budget. Prepared 21 October 2026; updated 22 October 2026 for the rename to OrbiFlick.*

> **How to read this.** Each section ends in concrete steps. Fees and store rules were checked against official sources on 21 October 2026 (links in [Sources](#sources)). Anything marked **(estimate)** is my rough guide, not a sourced fact. Anything marked **⚠ check** is uncertain or changes often, so confirm it before you rely on it.

---

## 0. At a glance

| | Recommendation |
|---|---|
| **Tech path** | Wrap the existing HTML5 game with **Capacitor 8** (current stable 8.5.3). No rewrite. |
| **Build iOS without a Mac?** | Yes: **Codemagic** cloud builds (500 free Mac minutes a month for individuals). A Mac is still the easier path. |
| **Native features to add** | Preferences storage, Game Center + Play Games leaderboards, AdMob rewarded ads with Google UMP consent, RevenueCat for purchases, Firebase Analytics + Crashlytics, native haptics/share. |
| **Fixed costs** | Apple **US$99 per year**; Google **US$25 one-off**. Store commission **15%** on Apple (Small Business Program); Google's fees are **changing** (see §3). |
| **Critical path** | Google's **12 testers for 14 continuous days** rule for new personal accounts. Start the closed test in week 2. |
| **Timeline** | About **10 working weeks**: soft launch mid-December 2026, global launch **w/c 11 January 2027** (after the Christmas slowdown). |
| **Game speed (current build)** | Starts at **50%** of the original speed (0.725 rad/s). Every **150 points** adds **+10%** (+0.145 rad/s), eased in over 0.5 s with a "SPEED UP!" alert. Capped at **3.0 rad/s**, reached at about **2,400 points**. |
| **Name** | **OrbiFlick** chosen (22 Oct 2026). Initial screening is clear on both stores, the US trademark register, the main domains and the @handle. See §5.1. |
| **⚠ Biggest risk** | **Name clearance.** NETGEAR's live **ORBI** mark (class 9) and Habicus's ORBI (class 9) make OrbiFlick a **moderate trademark risk**. **Do now:** secure **orbiflick.com** and **@orbiflick**, and get a trademark lawyer to clear the name before you build the store records. See §5.1. |

---

## 1. Tech path: wrapping the HTML5 game

### 1.1 Options compared

| Option | iOS | Android | Effort for OrbiFlick | Verdict |
|---|---|---|---|---|
| **Capacitor** (Ionic) | ✅ | ✅ | Low. The HTML file goes into `www/` almost unchanged. | **Recommended** |
| Cordova | ✅ | ✅ | Low, but the ecosystem is older and has fewer current plugins. | Workable, not preferred |
| TWA (Bubblewrap) / PWA | ❌ (Play only) | ✅ | Very low, but no iOS store build and no native AdMob SDK. | Not suitable |
| Rewrite in Godot / Unity | ✅ | ✅ | High: a rebuild **(estimate: 3–6+ weeks for a solo beginner)**. | Not worth it at this stage |

### 1.2 Why Capacitor

- **You keep your game.** It runs in the system WebView (WKWebView on iOS, Android System WebView), so your canvas, WebAudio and game logic stay as they are.
- **Plugins are maintained and current.** As of 21 Oct 2026 on npm: `@capacitor/core` 8.5.3, `@capacitor-community/admob` 8.2.1, `@revenuecat/purchases-capacitor` 13.7.4, `@capacitor-firebase/*` 8.5.2.
- **It handles Apple's "web wrapper" rule.** App Review Guideline 4.2 (Minimum Functionality) rejects apps that are just repackaged websites. OrbiFlick is a full offline game with native leaderboards, haptics and purchases, so it's well placed. Still, don't present it as "a website in an app".
- **Requirements:** Capacitor 8 needs Node.js 22+, Xcode 26+ and Android Studio Otter (2025.2.1)+. Apple has required apps to be built with **Xcode 26 / the iOS 26 SDK** since 28 Apr 2026. Google Play has required new apps and updates to **target Android 16 (API 36)** since 31 Aug 2026. Capacitor 8 defaults already meet both.

### 1.3 Steps (week 1)

1. Install Node 22 LTS, Android Studio and, if you have a Mac, Xcode 26.
2. Create the project (commands below), then copy `orbiflick.html` to `www/index.html`. Choose your **bundle ID** carefully: you cannot change it after you publish.

```
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "OrbiFlick" com.yourname.orbiflick --web-dir www
```

3. Run `npx cap add android` and `npx cap add ios`, then `npx cap sync`.
4. Run on a real phone. On Android, use `npx cap run android`. On iOS, open the project with `npx cap open ios` in Xcode, or use Codemagic (§3.3).
5. Use Git from day one, even a private GitHub repo. Tag every build you ship.

> **Tip:** Split the single file into `index.html`, `game.js` and `style.css` only if it helps you. It isn't required.

---

## 2. Pre-launch game work

Work through these in order. Each item names the tool and the change to make.

### 2.1 Clean-up and security

- [ ] **Remove the debug hook.** Delete `window.ORBIFLICK = { G, startRun, … }` (line 838). Don't ship any other dev-only globals or console cheats either.
- [ ] Add a build flag (`const DEBUG = false`) so test tools can't leak into release builds.
- [ ] Strip `console.log` calls and minify for release (for example with `esbuild` or `terser`). This is optional, but it makes casual tampering harder.

### 2.2 Durable storage (replace localStorage)
Capacitor's own docs warn that WebView **localStorage "must be considered transient"**, because the OS may reclaim it when space is low.

- [ ] Swap the `get`/`set` helpers (lines 208–209) to use **`@capacitor/preferences`**, which uses native key-value storage. Keep the same `orbiflick_` keys. Preferences is async, so load everything once at boot into the in-memory `save` object.
- [ ] **One-off migration:** on first launch of the native build, copy any existing `orbiflick_*` localStorage values into Preferences.
- [ ] Save on important events (coin change, purchase, skin equip) and when the app is backgrounded (`@capacitor/app` → `appStateChange`).

**Cloud save options**, from simplest to most work:

| Option | What it covers | Effort | When |
|---|---|---|---|
| Store-restored purchases (RevenueCat / StoreKit / Play Billing) | Anything **paid** (ad removal, premium skins) comes back on reinstall or a new device. | Comes with IAP | **Launch: required** |
| Firebase Anonymous Auth + Firestore | Coins, unlocked skins, streak, best score | Medium | v1.1 (post-launch) |
| Game Center saved games / Play Games Saved Games | Same, using platform accounts | Medium–high, with thinner Capacitor support | Only if you want to avoid Firebase |

> **Recommendation:** launch with Preferences plus store-restored purchases. Add a Firebase cloud save in v1.1 if players ask for it. Paid items are what really must survive a reinstall, and the stores already handle that.

### 2.3 Real global leaderboards
| Option | Pros | Cons |
|---|---|---|
| **Game Center (iOS) + Google Play Games Services (Android)** | Free, no server, players already signed in, built-in daily/weekly views. Game Center now also shows in Apple's Games app. | Two separate leaderboards (one per platform). The Capacitor plugin is small. |
| Firebase (Firestore + Cloud Functions) | One cross-platform board, fully custom | You must build anti-cheat and moderation. Cloud Functions need the pay-as-you-go plan **(⚠ check current Firebase pricing)**. |

- [ ] **Recommended:** platform leaderboards via **`@openforge/capacitor-game-connect`** (v5.0.2, updated Sept 2026; about 900 npm downloads a month). It's a small plugin, so **prototype it in week 4 and keep the local top-10 as a fallback**.
- [ ] Create two boards on each platform: **All-time best** and **Daily Challenge**. Use a recurring leaderboard on Game Center and a daily time span on Play Games. This fits your date-seeded daily mode neatly.
- [ ] Set a plausible maximum score in each console to reject obviously hacked scores.
- [ ] Keep the local top-10 for offline play and for players who decline sign-in.

### 2.4 Rewarded ads (second chance)

- [ ] Install **`@capacitor-community/admob`** (8.2.x). It wraps the Google Mobile Ads SDK and includes **Google UMP consent** and **iOS App Tracking Transparency** helpers.
- [ ] Replace the placeholder second chance with a rewarded ad. Give the reward **only on the "rewarded" event**, never on "dismissed".
- [ ] Keep it opt-in: one second chance per run, with a clear "No thanks". AdMob policy requires that users **affirmatively opt in** to each rewarded ad.
- [ ] **Use Google's test ad unit IDs during all development.** Clicking your own live ads can get your AdMob account suspended.
- [ ] Preload the next rewarded ad after each run so the button never waits on a network call. Hide the button when offline or when no ad is loaded.
- [ ] Publish an **`app-ads.txt`** file on your developer website (the URL listed in the stores). AdMob uses it to verify your inventory.
- [ ] Startup order: request UMP consent → (iOS) ATT prompt if you want tracking → initialise AdMob → preload the rewarded ad.

### 2.5 In-app purchases

- [ ] Use **RevenueCat** (`@revenuecat/purchases-capacitor`). One API covers StoreKit and Google Play Billing, handles receipts and restores purchases. It's **free until US$2,500 monthly tracked revenue**, then 1% of the total.
- [ ] Suggested launch catalogue. Prices are **estimates**, so test them.

| Product | Type | Suggested price | Notes |
|---|---|---|---|
| OrbiFlick Plus (no ads + free revive) | Non-consumable | £2.99–£3.99 | See decision 2: with rewarded-only ads, plain "remove ads" removes very little. |
| Neon Pack (3 premium skins) | Non-consumable | £1.99 | Cosmetic only |
| Legend skin (e.g. animated) | Non-consumable | £0.99–£1.99 | Cosmetic only |
| Coin bag (optional) | Consumable | £0.99 | Coins buy cosmetics only, so this is **not pay-to-win** |

- [ ] Add a **Restore Purchases** button in Settings or the Shop. Apple expects one for non-consumables.
- [ ] **Avoid paid random rewards (loot boxes)** entirely. If you ever add them, both stores require you to show the odds before purchase. Belgium is commonly reported to treat paid loot boxes as gambling **(⚠ check)**.
- [ ] Test purchases with Apple **Sandbox / TestFlight** accounts and Google Play **licence testers**.

### 2.6 Performance on low-end devices

- [ ] Test on a cheap Android phone (2–4 GB RAM) and the oldest iPhone you can borrow.
- [ ] Add a **"Low effects"** toggle that cuts particles and trail length, and switch it on automatically if the frame time stays above ~20 ms (under ~50 fps).
- [ ] You already cap the device pixel ratio at 2. Consider 1.5 on low-end Android.
- [ ] Pause the game loop and suspend the `AudioContext` when the app is backgrounded. Resume on return, because iOS needs audio resumed after an interruption.
- [ ] Pre-render static rings and glow to an offscreen canvas instead of redrawing blur every frame.

### 2.7 App shell: icon, splash, orientation, safe areas

- [ ] **Icon:** 1024×1024 PNG master with no transparency on iOS. Generate every size with **`@capacitor/assets`**. Google Play also needs a 512×512 icon and a 1024×500 feature graphic.
- [ ] **Splash:** `@capacitor/splash-screen`. Use a dark background in your neon palette and hide it as soon as the canvas has drawn.
- [ ] **Orientation:** lock to portrait. Set it in Xcode (Deployment Info) and with `android:screenOrientation="portrait"` in `AndroidManifest.xml`, or use `@capacitor/screen-orientation`.
- [ ] **Safe areas:** you already have `viewport-fit=cover`. Pad the HUD with `env(safe-area-inset-top)` etc. so it clears the notch and Dynamic Island. Use `@capacitor/status-bar` to hide or style the status bar.
- [ ] **Android back button:** with `@capacitor/app` → `backButton`, go from game to pause, pause to menu, and menu to exit.

### 2.8 Audio and haptics

- [ ] **Haptics:** `navigator.vibrate` doesn't work on iOS. Switch to **`@capacitor/haptics`** (impact light/medium for taps, near-misses and death) and keep the existing call as the web fallback.
- [ ] Add separate **Sound** and **Haptics** toggles, and save them.
- [ ] Test with the iPhone silent switch on, with Bluetooth headphones, and with an incoming call during a run.

### 2.9 Share

- [ ] Replace `navigator.share` with **`@capacitor/share`**. Share a **score card image** drawn from the canvas plus your store link (see §7.1).

### 2.10 Offline play

- [ ] The game is self-contained, so bundle everything locally and load nothing from a CDN.
- [ ] Degrade gracefully when offline: hide the ad button, queue leaderboard submissions and keep the daily challenge working (it's date-seeded). Use the **UTC date** consistently so the daily challenge is the same for everyone.

### 2.11 Analytics and crash reporting

- [ ] **Firebase Analytics + Crashlytics** via `@capacitor-firebase/analytics` and `@capacitor-firebase/crashlytics` (8.5.2). Crashlytics reports native crashes. Also send JS errors with `recordException` from a `window.onerror` handler.
- [ ] Log a small, fixed set of events:

| Event | Key params | Answers |
|---|---|---|
| `run_start` / `run_end` | mode, score, duration_s, cause | Session length and difficulty curve |
| `first_run_complete` | score | Onboarding drop-off |
| `revive_offered` / `revive_accepted` | score | Rewarded ad opt-in rate |
| `ad_reward_granted` | placement | Ad revenue driver |
| `iap_purchase` | product_id | Monetisation |
| `skin_equip`, `skin_buy` | skin_id | Cosmetic appeal |
| `daily_play`, `streak_claim` | day | Live-ops health |
| `share` | context | Viral loop |

- [ ] Tie analytics and ad personalisation to the consent result (§4). Don't log personal data.

---

## 3. Store accounts and costs (verified 21 Oct 2026)

### 3.1 Fees and commission

| Item | Cost | Source |
|---|---|---|
| Apple Developer Program | **US$99 per membership year**, shown in local currency at enrolment | [Apple: enrol][apple-enrol] |
| Google Play Console | **US$25 one-off** registration fee. Prepaid cards not accepted; may ask for government ID. | [Play Console Help][play-fee] |
| Apple commission | 30% standard; **15%** in the App Store Small Business Program (new developers, or under US$1M proceeds a year). **You must enrol.** | [Apple Small Business Program][apple-sbp] |
| Google Play fee: rest of world | **15%** on the first US$1M of yearly earnings if you enrol in the 15% tier | [Google service fees][play-fees] |
| Google Play fee: US, UK, EEA (from 30 Jun 2026); Australia, Japan (from 30 Sep 2026) | **New structure ⚠:** service fee plus a separate **5% billing fee** when you use Play Billing. Google's blog says the service fee "starts at 10%" on the first US$1M; the Help Centre table lists 20% (new installs) for other transactions, or 15% in the Play Games Level Up programme. The details are confusing, so **check your Play Console** before setting prices. | [Google service fees][play-fees], [Google blog, 24 Jun 2026][play-blog] |
| RevenueCat | Free under US$2,500 monthly tracked revenue, then 1% of the total | [RevenueCat billing docs][rc] |
| Codemagic (cloud Mac builds) | 500 free Mac mini M2 minutes a month (individual), then US$0.095/min | [Codemagic pricing][codemagic] |

**Account steps**

1. **Apple:** enrol as an **Individual**. Your legal name appears as the seller. Enrolling as an Organisation needs a legal entity and a D-U-N-S number. You need two-factor authentication on your Apple Account. Once approved, sign the **Paid Applications Agreement** in App Store Connect, add bank and tax details, and **enrol in the Small Business Program**.
2. **Google:** create a **personal** developer account with a dedicated Google account and complete identity verification. Then set up a payments profile, **enrol in the 15% tier / account group** where it applies, and link **AdMob** and **Firebase**.
3. **AdMob:** create the account, add both apps (they can be linked to the store listings later), and create one rewarded ad unit per platform.

### 3.2 Google Play's testing rule for new personal accounts
Personal developer accounts created after 13 Nov 2023 must run a **closed test with at least 12 testers who stay opted in for at least 14 continuous days** before applying for production access. **Internal testing doesn't count.** When you apply, you answer questions about your test. Google may ask for more testing if engagement looks low. ([Play Console Help][play-testing])

- **Plan:** recruit **15–20 testers** to allow for drop-outs: friends, family, Discord, r/AndroidClosedTesting, local game-dev groups. Testers need a Google account and an Android phone.
- Start the closed test **as early as possible (week 2)** with a basic build, then keep pushing updates to the same track. The 14-day clock runs while you keep building.
- Don't buy fake testers. Google looks at engagement and wants real feedback.
- Organisation accounts are exempt, but they need a legal entity and a D-U-N-S number. That isn't worth setting up just for this.

### 3.3 Building iOS without a Mac

| Route | Cost | Notes |
|---|---|---|
| Your own Mac (any Apple-silicon Mac that runs Xcode 26) | Hardware **(estimate: £400+ used)** | Easiest for debugging on a real iPhone |
| **Codemagic** | Free tier (500 min a month) | Has an official Capacitor sample. It can sign builds and upload them to TestFlight. A typical build is roughly 10–20 min **(estimate)**. |
| Rented cloud Mac (e.g. MacinCloud) | Monthly fee **(⚠ check)** | A fallback if you need the Xcode interface |
| Xcode Cloud | Some free hours come with the Apple membership **(⚠ check)** | Needs Xcode on a Mac for setup |

> **Without a Mac you can't easily debug iOS-only issues.** Borrow a Mac for a day if you hit one. Test on a real iPhone via TestFlight.

---

## 4. Legal and compliance

> I'm not a lawyer and this isn't legal advice. It covers the usual steps a solo developer takes. If you aim at children or earn significant revenue, get professional advice.

### 4.1 Privacy policy (both stores require one)

- [ ] Host it at a stable URL, for example `orbiflick.com/privacy` (or `yourname.dev/orbiflick/privacy`) (GitHub Pages is free). Use the same site for `app-ads.txt` and a support email.
- [ ] Cover: who you are and how to contact you; the data collected by **AdMob, Firebase, RevenueCat, Game Center and Play Games**; what each is used for; legal basis (UK GDPR / EU GDPR: consent for ads, legitimate interests for crash reporting); retention; user rights; children; how to withdraw consent (add a **"Privacy settings"** button that reopens the UMP form).
- [ ] Generators such as App Privacy Policy Generator or Termly can give you a starting draft **(⚠ check terms)**. Then edit it to match your SDKs.

### 4.2 Apple App Privacy labels and Google Data safety

- [ ] Fill in **App Privacy** in App Store Connect and the **Data safety** form in Play Console. Google publishes AdMob disclosure guides for both ([iOS][admob-ios-disclosure], [Android][admob-play-disclosure]). Firebase and RevenueCat have similar pages.
- [ ] Typical answers for this setup: device or advertising identifiers, product interaction, diagnostics (crashes), purchase history, and coarse location as used by ads **(⚠ check against each SDK's current guide)**.
- [ ] **Privacy manifests (iOS):** current AdMob, Firebase and RevenueCat SDKs ship their own. Keep the SDKs up to date and check Xcode's privacy report before you submit.
- [ ] If you add accounts (e.g. Firebase cloud save with sign-in), Google requires a way to **delete the account** in the app and on the web. Anonymous cloud save avoids most of this.

### 4.3 ATT and GDPR consent

- [ ] **EEA, UK and Switzerland:** Google requires a **Google-certified CMP** (IAB TCF) to serve personalised ads. Without one, only limited ads are served. **Google UMP** is free, certified and built into the AdMob plugin ([AdMob Help][admob-cmp]).
- [ ] **iOS ATT:** you must show the system prompt before using the IDFA for tracking. Add `NSUserTrackingUsageDescription` (e.g. "Allow tracking to show ads that are more relevant to you. OrbiFlick stays free either way."). UMP can show an explainer screen first. Simpler option: **don't request ATT** and serve non-tracking ads. You'll earn less per ad, but the app is simpler and more privacy-friendly. **(estimate: the size of the revenue drop varies)**
- [ ] Show consent once, at first launch before the first ad, and never in the middle of a run.

### 4.4 Age ratings

- [ ] **Apple:** answer the updated age-rating questionnaire in App Store Connect. Apple's ratings are now 4+, 9+, 13+, 16+ and 18+, and answers were compulsory from 31 Jan 2026 ([Apple][apple-age]). OrbiFlick has no violence or user-generated content, so it will probably get a low rating. Mention ads and IAP honestly.
- [ ] **Google:** complete the **IARC** content-rating questionnaire in Play Console. It issues ratings such as PEGI (UK/EU), ESRB and USK automatically. Expect PEGI 3 **(estimate)**.

### 4.5 Children and families
A bright, simple one-tap game **will attract children** even if you don't target them.

- [ ] **Google Play target audience:** you must declare age groups. Including under-13s brings in the **Families Policy**: only Families self-certified ad SDKs, no personalised ads for children, and a neutral age screen for mixed audiences ([Families policy][play-families]). **Simplest compliant route: target 13+** and make sure your listing and art don't specifically appeal to young children **(⚠ Google judges this from your store presence)**.
- [ ] **UK ICO Children's Code** (Age Appropriate Design Code) applies to services **likely to be accessed** by children, games included. Practical steps: privacy-friendly defaults, minimal data, no nudging, clear wording ([ICO][ico]).
- [ ] **Apple Kids category:** don't opt in. It brings strict rules on third-party ads and analytics.
- [ ] Keep monetisation child-safe anyway: no fake timers, no "only 2 left!" pressure, prices shown clearly, and no in-run purchase prompts.

### 4.6 Loot boxes and IAP disclosure

- [ ] The current design (fixed-price cosmetics, coins earned or bought) has **no loot boxes**. Keep it that way.
- [ ] Both stores list "In-app purchases" and "Contains ads" on your page automatically once you declare them. Make sure those declarations are accurate.

---

## 5. Store listing and ASO

### 5.1 Name: OrbiFlick (chosen 22 Oct 2026)

The game was renamed **OrbiFlick** (brand spelling; the in-game logo is stylised **ORBIFLICK**). The previous working title clashed with a live same-genre game on the App Store, and its suffix carried trademark risk.

> **⚠ Immediate to-do (this week, before anything else is public):**
>
> - [ ] Register **orbiflick.com** (add **orbiflick.app** and **orbiflick.games** too if you can; they're cheap).
> - [ ] Claim **@orbiflick** on TikTok, Instagram, YouTube and X/Bluesky, even if you won't post yet.
> - [ ] Book a **trademark lawyer** to clear the name before you create the store records and icon.

**Screening results (22 October 2026; a quick screen, not a legal clearance):**

| Check | Result |
|---|---|
| App Store / Google Play | **No app titled OrbiFlick** found |
| US trademark register (USPTO) | **No ORBIFLICK** mark found |
| Domains | **orbiflick.com**, **.app** and **.games** looked **unregistered** |
| Social handle | **@orbiflick** looked **unregistered** |
| Similar app names | **"OrbFlick: Tick Tally"** on APKPure (a nearby name; check what it is and whether it's active); a **"Mystic Orb Flick"** listing that has since been removed |
| Nearby trademarks | **⚠ ORBI (NETGEAR)**, live in **class 9** (software / electronics), and **ORBI (Habicus)**, also class 9. Games are class 9 (downloadable) and 41 (online services). **Moderate risk:** OrbiFlick only shares the ORBI prefix, but NETGEAR is a large brand owner. |
| Not checked | **UK IPO and EUIPO** registers; **.io** and **.gg** domains |

- **Verdict:** a good candidate with no direct conflicts. The ORBI marks are the open question. Get **professional clearance** (US, UK and EU, classes 9 and 41) before you spend on art and marketing, and register the domains and handles **now**, since they cost little and can disappear.
- Consider filing your own **OrbiFlick** trademark (UK IPO and/or USPTO, classes 9 and 41) once the lawyer is happy **(estimate: from ~£170 for one UK class; check current fees)**.
- Use a descriptive store title for search, e.g. **"OrbiFlick: One-Tap Orbit"** (see §5.2).

### 5.2 Listing fields

| Field | Limit | Draft |
|---|---|---|
| App name (Apple) / Title (Google) | 30 chars | *OrbiFlick: One-Tap Orbit* (24 chars) |
| Subtitle (Apple) | 30 chars | *One tap. One chance.* |
| Short description (Google) | 80 chars | *Tap to switch orbits, dodge spikes, grab coins. How far can one tap take you?* |
| Keywords (Apple, hidden) | 100 chars, comma-separated | `one tap,arcade,reflex,orbit,circle,dodge,neon,casual,offline,daily challenge,skins,hyper` |
| Promotional text (Apple) | 170 chars, editable without review | Use it for events: *"Halloween Ghost skin this week only!"* |

**Keyword tips:** don't repeat words that are already in the name or subtitle. Don't use competitor names. In week 5, check search volume with a free ASO tool or plain App Store autocomplete **(estimate: paid tools aren't needed at launch)**.

### 5.3 Description draft (Google full description: 4,000 chars)
> **One tap. One chance.**  
> Your ball races around two glowing orbits. Tap to jump between the inner and outer ring, slip past red spikes and snatch coins. Sounds simple, until the speed starts climbing.
>
> **Why you'll keep playing**  
> • Instant one-tap controls: easy to learn, brutal to master  
> • Build combos up to x9 and score near-miss bonuses for daring dodges  
> • A new Daily Challenge every day: same course for everyone, so you can compare scores  
> • Daily rewards with a streak bonus  
> • Unlock 8+ neon skins with unique trails: fire, sparkle, ghost and rainbow  
> • Global leaderboards via Game Center / Google Play Games  
> • Plays offline, with no account needed  
> • Optional ads only: watch one to keep a run going, or skip it. Never pay-to-win.  
>
> Can you beat your best?

### 5.4 Screenshots and video

| Asset | Apple | Google |
|---|---|---|
| Phone screenshots | Required: **1320×2868** (6.9") portrait; up to 10. Smaller sizes scale down. ([spec][apple-shots]) | 2–8 phone screenshots; **1080×1920** recommended **(⚠ check current spec in Console)** |
| Video | App preview, **15–30 s**, 886×1920 portrait ([spec][apple-preview]) | YouTube link (shown above screenshots) |
| Other | — | Feature graphic 1024×500, icon 512×512 |

Your current screenshots are 780×1688, which isn't a store size. Capture new ones from the iOS Simulator (iPhone 17 Pro Max class) or render them at 1320×2868.

**Screenshot set (6):**

1. Gameplay with a big headline: "ONE TAP. ONE CHANCE."
2. Near-miss moment with a combo popup: "Dodge by a pixel. Combo x9."
3. Skins grid: "Unlock neon skins & trails."
4. Daily Challenge: "New challenge every day."
5. Leaderboard: "Beat the world."
6. "Play offline. No pay-to-win."

**Video (20–25 s):** a 1-second hook (fast near-miss), then the speed ramp, a combo build and a skin swap, then a game-over with a big score and "Can you beat it?". Record real gameplay with no fake footage; Apple requires captured footage.

---

## 6. Testing

### 6.1 Test stages

| Stage | Tool | Who | When |
|---|---|---|---|
| Internal | **Play internal testing** (up to 100 testers, builds within seconds); **TestFlight internal** (your team) | You plus 2–3 friends | Weeks 1–3 |
| Closed (Google gate) | **Play closed testing**: 12+ testers × 14 days | 15–20 recruits | **Weeks 2–5** |
| External beta | **TestFlight external** (needs a quick beta review; public link possible) | 20–50 players | Weeks 4–6 |
| Soft launch | Real store release in a few countries | Public | Weeks 7–8 |

**Device matrix (minimum):** one low-end Android (Android 10–12, 2–3 GB RAM), one recent Android and one iPhone. Use Firebase Test Lab's free quota for more Android devices **(⚠ check quota)**.

### 6.2 Soft launch

- **Markets:** **Canada, Australia, New Zealand**. They're English-speaking and comparable to the UK/US, and launching there keeps your main markets fresh. Optional extra: the **Philippines** for cheap volume and low-end device data.
- **How:** release to production with only those countries selected (Apple: Pricing and Availability; Google: Countries/regions). Run for **2 weeks**. Drive traffic with organic social posts, plus a small paid test if you can afford it (§9).
- **Note:** the Google Play production release needs the closed-test approval from §3.2 first.

### 6.3 Metrics and targets

**Published benchmarks:** GameAnalytics 2025 report on 2024 data, covering about 11,600 games ([summary][ga]):

- D1 retention: top 25% of games **26.5–27.7%**, bottom 25% **10–11.5%**. On iOS the top 25% reach **31–33%**.
- D7 retention: median **3.4–3.9%**, top 25% **7–8%**.
- Session length: median **5–6 min**, top 25% **8–9 min**. Median daily playtime is 22 min.
- Arcade games lead on D1 but struggle with long-term retention.

**Soft-launch targets for OrbiFlick.** These are **rough rules of thumb, not sourced facts**:

| Metric | "Fix before global" | "OK to launch" | "Great" |
|---|---|---|---|
| D1 retention | < 25% | 30–35% | 40%+ |
| D7 retention | < 5% | 8–10% | 12%+ |
| Avg session length | < 3 min | 4–6 min | 8 min+ |
| Sessions per user per day | < 2 | 3–4 | 5+ |
| Rewarded-revive opt-in (of runs where offered) | < 10% | 20–35% | 40%+ |
| Crash-free users (Crashlytics) | < 99% | 99.5%+ | 99.8%+ |
| Ad ARPDAU (rewarded-only, Tier-1 countries) | — | **US$0.01–0.05 (estimate; varies a lot by country)** | — |

**If D1 is low:** look at the first 60 seconds. Is the start speed too fast or too slow (it's currently 50%, +10% every 150 points)? Is the first death unfair? **If D7 is low:** strengthen the reasons to come back, such as the daily challenge, streak, skin goals and weekly events.

---

## 7. Launch and marketing

### 7.1 Viral loops built into the game

- [ ] **Share-your-failure card:** on game over, draw a 1080×1920 image with the score, best combo, skin and a cheeky line ("Died at 312. Combo x7. Beat that."), then share it with `@capacitor/share` plus your store link.
- [ ] **Daily Challenge share, Wordle-style:** text such as `OrbiFlick Daily #42 ⭕ 318 pts 🔥x8` plus the link. It's the same course for everyone, so comparing scores is natural.
- [ ] **Challenge a friend:** share a "beat my score" link that opens the store. Later, add deep links that open the same daily seed.
- [ ] **Don't reward reviews or ratings with coins.** Both stores forbid incentivised reviews. Be cautious about rewarding shares too: Facebook/Meta bans incentivised sharing **(⚠ check each platform's rules)**.

### 7.2 Short-form video (TikTok, YouTube Shorts, Instagram Reels)

- Post **3–5 clips a week from week 5**. Building a following before launch is the free part of user acquisition.
- Formats that suit OrbiFlick: an "Only 1% get past 500" challenge; near-miss compilations; speed-ramp "watch it get impossible"; skin reveals; honest "solo dev, day 30" diaries; reactions to friends failing.
- Keep each clip 7–15 s, with the hook in the first second, captions on and the store link in your bio. Reuse the same clip across all three platforms.

### 7.3 Communities

- **Reddit:** r/playmygame, r/IndieGaming, r/indiedev, r/iosgaming, r/AndroidGaming, r/hypercasual **(⚠ read each sub's self-promotion rules; many allow it only on set days)**. Post a GIF or clip plus a genuine "I made this solo" story, not an advert.
- **Discord:** start a small server for testers, and give early supporters a cosmetic "Founder" skin. A free cosmetic gift is fine.
- **Other:** itch.io (put the HTML5 version up free as a demo funnel), X/Bluesky #screenshotsaturday, local game-dev meetups.

### 7.4 Influencers and press

- Approach **micro-creators (5k–50k followers)** in mobile/casual gaming. Offer early access or promo codes, not big fees **(estimate: some will post for free; paid posts commonly cost tens to a few hundred pounds)**.
- Apple **offer codes** and Google Play **promo codes** let you give away premium skin packs.
- Make a one-page **press kit**: icon, 5 screenshots, GIF, 100-word description, links, contact.
- Submit a **featuring nomination** in App Store Connect about 3–6 weeks before launch, and apply to any Google Play indie programmes that are open **(⚠ check what's available)**.

### 7.5 Launch-day checklist

- [ ] Both versions approved and set to **manual release**, so you control the moment.
- [ ] Countries expanded from the soft-launch set to worldwide.
- [ ] Ads live: real ad unit IDs, `app-ads.txt` verified, test mode **off** (check the release build).
- [ ] IAP products **approved/active**; one real purchase tested and refunded.
- [ ] Leaderboards **published** (Google Play Games needs a separate publish step).
- [ ] Crashlytics and Analytics showing live data.
- [ ] Launch clip posted on TikTok, Shorts and Reels; Reddit and Discord posts ready.
- [ ] Press kit and emails sent to creators.
- [ ] Block out time to reply to reviews and fix bugs for the next 72 hours.
- [ ] Hotfix branch ready. Expedited review is available on Apple for critical bugs.

---

## 8. Post-launch

### 8.1 Live ops (lightweight, for a solo creator)

- **Weekly:** a new or rotating skin in a "Featured" shop slot. Ship a **skin vault** in the app (e.g. 12 extra skins) and unlock them by date or with **Firebase Remote Config**. That way most weeks need no app update.
- **Events:** weekend double coins; a monthly "tournament" on a recurring leaderboard; seasonal themes (Christmas, Valentine's, Halloween) as palette and obstacle reskins.
- **Daily:** the challenge and streak you already have. Add a streak-saver as a rewarded ad (optional and capped).
- Change event text in Apple's **promotional text** with no review needed.

### 8.2 Updates

- **v1.0.x hotfixes** within 48 h for crashes.
- **Every 2–3 weeks** for the first 2 months: balance, new skins, player requests.
- **v1.1:** cloud save, friend challenges, more daily modes.
- Keep SDKs current. Both stores raise minimum SDK and API levels every year (Apple each spring, Google each August).

### 8.3 Reviews and ratings

- [ ] Ask for reviews with the native prompt (`@capacitor-community/in-app-review`) at a **happy moment**, such as a new personal best, never after a death. The OS limits how often the prompt appears.
- [ ] Reply to **every** review in the first month, in both consoles. Thank people and say what you fixed.
- [ ] Track rating, crash-free users, ANR rate (Android vitals) and retention weekly.

---

## 9. Timeline and budget

### 9.1 Week-by-week (starting Monday 26 October 2026)

| Week | Dates | Focus | Done when |
|---|---|---|---|
| **1** | 26 Oct | **Secure orbiflick.com and @orbiflick; book trademark clearance** (do this now if you can). Enrol with Apple and Google. Set up Capacitor and Git. Remove the debug hook. Get it running on a phone. | App runs natively on Android (+ iOS via Mac/Codemagic) |
| **2** | 2 Nov | Preferences storage + migration. Portrait lock, safe areas, back button, haptics, share. Icon and splash. **Start the Google closed test (12+ testers).** Draft the privacy policy and website. | Closed test live, 14-day clock running |
| **3** | 9 Nov | AdMob rewarded + UMP + ATT (test IDs). RevenueCat + products in both stores. Restore button. | Test ad and sandbox purchase work on both platforms |
| **4** | 16 Nov | Game Center + Play Games leaderboards. Firebase Analytics + Crashlytics. Low-effects mode. TestFlight external beta. | Scores post; events visible in Firebase |
| **5** | 23 Nov | Store listings: screenshots, video, description, privacy labels, Data safety, ratings, target audience. Start posting short clips. | Listings complete in both consoles |
| **6** | 30 Nov | Fix beta feedback. **Apply for Google production access** once 14 days are done. Submit iOS for review. | Production access granted; iOS approved |
| **7** | 7 Dec | **Soft launch** (CA/AU/NZ) on both stores. Watch crashes daily. | Live in soft-launch markets |
| **8** | 14 Dec | Read soft-launch metrics. Tune difficulty, revive placement and prices. Submit v1.0.1. Featuring nomination. | Go/no-go against §6.3 targets |
| — | 21 Dec–3 Jan | **Holiday buffer.** Expect slower reviews and support at both stores **(⚠ check Apple's holiday notice)**. Light fixes and content prep only. | — |
| **9** | 4 Jan 2027 | Final polish. Line up creators, press kit and launch clips. Set manual release. | Launch checklist (§7.5) ✅ |
| **10** | 11 Jan 2027 | **Global launch** (a Tuesday works well). Then 72 h of review replies and hotfixes. | Live worldwide |

> **Fast track (about 7 weeks):** skip the separate soft launch and treat the first two live weeks as one. The Google 14-day test still sets the minimum pace.

### 9.2 Budget
Fixed fees are converted roughly at US$1 ≈ £0.75 **(estimate; Apple shows a local price at checkout)**. All other figures are **estimates**.

| Item | Minimum | Comfortable | Notes |
|---|---|---|---|
| Apple Developer Program (year 1) | ~£75 (US$99) | ~£75 | Verified fee; recurring yearly |
| Google Play Console | ~£19 (US$25) | ~£19 | Verified; one-off |
| Domain + website (privacy, app-ads.txt, support) | £0–£12 | £12 | GitHub Pages is free |
| iOS builds | £0 (Codemagic free tier) | £400–£600 (used Mac mini) | |
| Test devices | £0 (own phone + friends) | £150–£300 (used iPhone + cheap Android) | |
| Icon / key art | £0 (DIY) | £50–£300 (freelancer) | |
| Privacy policy | £0 (generator + edit) | £0–£100 | |
| RevenueCat, Firebase (Analytics/Crashlytics), AdMob, UMP | £0 | £0 | Free at this scale **(⚠ Firebase: stay on free plan unless you add Cloud Functions)** |
| ASO tool | £0 | £0–£50 (one month) | |
| Soft-launch paid test | £0 | £200–£500 | Optional |
| Creators / promo | £0 (free codes) | £100–£500 | |
| Music/SFX | £0 (current synth) | £0–£50 | |
| **Total (approx.)** | **~£95–£110** | **~£1,000–£2,500** | |

---

## 10. Final pre-submission checklist

**Code and build**

- [ ] `window.ORBIFLICK` debug hook removed; `DEBUG=false`; no cheats or console commands
- [ ] Release build uses **real** AdMob IDs, and test IDs are gone. Check this twice.
- [ ] Version number and build number bumped (iOS `CFBundleVersion`, Android `versionCode`)
- [ ] Android: signed **AAB** with Play App Signing; **upload key backed up** somewhere safe; `targetSdk 36`
- [ ] iOS: built with **Xcode 26 / iOS 26 SDK**; minimum iOS set (Capacitor 8 default: 15)
- [ ] Portrait lock, safe areas and the Android back button all behave correctly
- [ ] Data survives app kill, phone restart and an app update (Preferences)
- [ ] Works in airplane mode (ads/leaderboards hidden or queued)
- [ ] 60 fps on a mid phone; playable on the low-end test phone
- [ ] Sound/haptics toggles work; silent switch, call interruption and backgrounding all tested

**Monetisation**

- [ ] Rewarded revive: opt-in, once per run, reward only on completion
- [ ] IAP: purchase, restore and reinstall tested on both stores; Restore button visible
- [ ] No pay-to-win; no random paid rewards
- [ ] `app-ads.txt` live on the developer website

**Privacy and legal**

- [ ] Privacy policy URL live and linked in both stores and in the app
- [ ] UMP consent shows for the UK/EEA (test with UMP debug geography); "Privacy settings" button reopens it
- [ ] ATT prompt and `NSUserTrackingUsageDescription` present (or you've deliberately decided not to track)
- [ ] Apple App Privacy labels + Google Data safety completed and matching your SDKs
- [ ] Apple age-rating questionnaire + Google IARC completed; Google target audience set
- [ ] Apple Paid Applications Agreement, tax and bank details done; Small Business Program enrolled; Google 15% tier enrolled where it applies

**Store listing**

- [ ] OrbiFlick cleared by a trademark lawyer (US, UK, EU; classes 9 and 41); orbiflick.com and @orbiflick registered
- [ ] Icon 1024 (Apple) + 512 (Google); feature graphic 1024×500
- [ ] Screenshots: Apple 1320×2868; Google phone set
- [ ] Preview video 15–30 s (Apple) / YouTube link (Google)
- [ ] Description, keywords, subtitle, short description, support URL, contact email
- [ ] App Review notes: "Single-player offline arcade game. No login required. Rewarded ads are optional. IAP can be tested with sandbox."

**Google-specific**

- [ ] Closed test: 12+ testers opted in for 14 continuous days; production access granted
- [ ] Play Games Services leaderboards **published**

---

## Top decisions for you

1. **The name.** **OrbiFlick is chosen.** Register orbiflick.com and @orbiflick now, then get a trademark lawyer to clear it against the ORBI (class 9) marks before week 2. Decide whether to file your own trademark.
2. **What the paid "no ads" product is.** Your only ads are optional rewarded ones, so "remove ads" removes almost nothing. Choose between (a) **OrbiFlick Plus = free revives with no ad + an exclusive skin** (recommended), or (b) adding occasional interstitials and selling their removal. Option (b) goes against your "keep ads optional" principle.
3. **Audience and tracking.** Target 13+ and use UMP consent with ATT (more ad revenue, more paperwork), or keep it simpler with no ATT and non-personalised ads. Only include under-13s if you're ready to take on the Families Policy.

*(Also: Mac or Codemagic for iOS builds, and whether to spend on a small soft-launch paid test.)*

---

## Sources

All accessed 21 October 2026.

- [Apple Developer Program: enrol, US$99/year](https://developer.apple.com/programs/enroll/)
- [Apple: Membership details and commission](https://developer.apple.com/programs/whats-included/)
- [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- [Apple: Upcoming requirements (Xcode 26 SDK since 28 Apr 2026)](https://developer.apple.com/news/upcoming-requirements/)
- [Apple: Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/) · [Age rating updates](https://developer.apple.com/news/upcoming-requirements/?id=07242025a)
- [Apple: App Review Guidelines (4.2 Minimum Functionality; 3.1.1 IAP / loot-box odds)](https://developer.apple.com/app-store/review/guidelines/)
- [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Apple app preview specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/)
- [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/) · [App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency)
- [Play Console: get started, US$25 fee](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Play Console: testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Play service fees](https://support.google.com/paymentscenter/answer/112622) · [15% tier enrolment](https://support.google.com/googleplay/android-developer/answer/10632485)
- [Google blog: Expanded billing choice and lower fees, 24 Jun 2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html)
- [Google Play target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Google Play Families policies](https://support.google.com/googleplay/android-developer/answer/9893335) · [Target audience settings](https://support.google.com/googleplay/android-developer/answer/9867159)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [AdMob: consent requirements for EEA, UK, Switzerland](https://support.google.com/admob/answer/13554116) · [Rewarded ad policies](https://support.google.com/admob/answer/7313578)
- [AdMob iOS data disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure)
- [AdMob Play Data safety disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure)
- [ICO Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code/)
- [Capacitor: storage guide](https://capacitorjs.com/docs/guides/storage) · [Environment setup](https://capacitorjs.com/docs/getting-started/environment-setup) · [Releases](https://github.com/ionic-team/capacitor/releases)
- [capacitor-community/admob](https://github.com/capacitor-community/admob) · [openforge/capacitor-game-connect](https://github.com/openforge/capacitor-game-connect) · [RevenueCat Capacitor](https://www.revenuecat.com/docs/getting-started/installation/capacitor)
- [RevenueCat billing](https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management) · [Pricing](https://www.revenuecat.com/pricing)
- [Codemagic pricing](https://codemagic.io/pricing/) · [Capacitor sample](https://github.com/codemagic-ci-cd/codemagic-sample-projects/blob/main/ionic/ionic-capacitor-demo-project/codemagic.yaml)
- [GameAnalytics 2025 benchmarks summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks) · [Report](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)
- Name screening for OrbiFlick (22 Oct 2026): searches of the App Store, Google Play, the USPTO trademark register, domain availability and social handles. Results in §5.1.


[apple-enrol]: https://developer.apple.com/programs/enroll/
[apple-sbp]: https://developer.apple.com/app-store/small-business-program/
[apple-age]: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
[apple-shots]: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
[apple-preview]: https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/
[play-fee]: https://support.google.com/googleplay/android-developer/answer/6112435
[play-testing]: https://support.google.com/googleplay/android-developer/answer/14151465
[play-fees]: https://support.google.com/paymentscenter/answer/112622
[play-blog]: https://android-developers.googleblog.com/2026/06/play-expanded-billing.html
[play-families]: https://support.google.com/googleplay/android-developer/answer/9893335
[admob-cmp]: https://support.google.com/admob/answer/13554116
[admob-ios-disclosure]: https://developers.google.com/admob/ios/privacy/data-disclosure
[admob-play-disclosure]: https://developers.google.com/admob/android/privacy/play-data-disclosure
[ico]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code/
[rc]: https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management
[codemagic]: https://codemagic.io/pricing/
[ga]: https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks
