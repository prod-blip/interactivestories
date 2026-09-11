# Google Play release guide

This folder is the release source of truth for `Moonlit Stories`
(`com.moonlitstories.app`). It reflects the app as currently implemented:

- four bundled interactive stories for ages 4–8, with two included and two in a
  permanent paid collection;
- playable offline after installation;
- no accounts, ads, analytics, subscriptions, or user-generated content;
- one non-consumable Google Play product, `premium_story_pack_1`;
- no sensitive or runtime device permissions;
- no developer-operated collection or sharing of user data; payment information
  is entered directly into and processed by Google Play.

Re-check these claims whenever a plugin, SDK, account system, analytics,
advertising, additional billing/payment integration, or network-backed feature
is added.

## 1. Account and app creation

1. Complete Play Console developer identity verification.
2. Create an app named **Moonlit Stories**.
3. Choose **Game**, **Free**, and English as the default language.
4. Use a monitored support email address.
5. Accept the Developer Program Policies, export-law declaration, and Play App
   Signing terms.

The package name is fixed after the first artifact upload. Confirm that
`com.moonlitstories.app` is the intended permanent ID before uploading.

## 2. Store setup

Use [listing.md](listing.md) for the English listing copy. Prepare these assets:

- Play Store icon: 512 × 512, 32-bit PNG with alpha, at most 1 MB;
- feature graphic: 1024 × 500, JPEG or 24-bit PNG without alpha;
- at least two phone screenshots: JPEG or 24-bit PNG without alpha, each side
  320–3840 px, with the long side no more than twice the short side;
- tablet screenshots are recommended if tablets remain supported.

Use real in-app scenes in the first screenshots. Avoid device frames, rankings,
pricing claims, or text implying endorsements.

## 3. App content declarations

Use [console-declarations.md](console-declarations.md) as a review aid while
answering the Console forms. Important selections for the current build are:

- target audience: **Ages 5 and under** and **Ages 6–8**;
- ads: **No**;
- app access: declare the paid collection and provide the review instructions
  from `console-declarations.md`;
- data safety: **No user data is collected or shared**;
- target API: 36;
- privacy policy: required because the app targets children;
- content rating: answer from the actual story content, including the tiger's
  threat and chase. Do not automatically answer “no violence” without reviewing
  those scenes.

Publish the privacy policy at a stable, public HTTPS URL, link it in Play
Console, and make it available inside the app before production submission.

## 4. First release

1. Generate and securely back up the upload keystore as described in the parent
   README.
2. Build `npm run android:bundle` with the four signing environment variables.
3. In Play Console, start with **Testing > Internal testing**, create a release,
   and upload `android/app/build/outputs/bundle/release/app-release.aab`.
4. Accept the default Play App Signing option, in which Google generates and
   protects the app-signing key.
5. Add testers, roll out the internal release, install from the Play opt-in link,
   and test install, launch, audio, both free stories, purchase success,
   cancellation, pending payment, restore, both paid stories, rotation,
   background/resume, and offline use after purchase.
6. Fix any pre-launch report failures before advancing tracks.
7. If the developer account is a personal account created after 13 November
   2023, run a closed test with at least 12 testers continuously opted in for 14
   days, then apply for production access.
8. Create the production release, use the release notes in [listing.md](listing.md),
   resolve all Console errors, and submit for review.

For every later release, increment `versionCode` in
`android/app/build.gradle`; Play rejects reused version codes.

## One-time product setup

Under **Monetize with Play > Products > One-time products**, create and activate:

- Product ID: `premium_story_pack_1`
- Name: `Full Library Unlock`
- Description: `Permanently unlock the complete Moonlit Stories shelf.`
- Purchase option ID: `buy`
- Purchase option: **Buy**
- Item type: **Digital content**

Choose the price in Play Console. The app deliberately leaves the amount to
Google Play's confirmation screen. The app does not consume this purchase, so
the Buy option behaves as a permanent, non-consumable entitlement.
Product IDs cannot be changed after creation, so enter the ID exactly as written
above.

Add internal testers under **Settings > Licence testing** as well as to the
internal track so Play presents test payment methods instead of charging them.

## Still needed from the publisher

- Developer account type and creation date.
- Public developer/support name and monitored email.
- Public privacy-policy URL (and the same policy linked inside the app).
- Final countries/regions, pricing decision, and category.
- Store icon, feature graphic, phone screenshots, and optional tablet assets.
- A securely stored upload keystore and backup.
- A tester list if the new-personal-account rule applies.
