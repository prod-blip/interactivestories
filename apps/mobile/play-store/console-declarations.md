# Play Console declaration notes

These notes describe the current binary; the publisher remains responsible for
checking every answer against the final uploaded artifact and current policy.

## App access

- Restricted content: **Yes** — some stories are behind the standard Google Play
  one-time-product paywall.
- Sign-in-details name: **Moonlit Stories reviewer access**
- Username and password: leave blank.
- Suggested review instruction: “No account or login is required. From the
  story shelf, press and hold the circular moon logo in the upper-left corner
  for two seconds. Enter the reviewer access code supplied below and select
  Unlock for review. This grants access to the complete story shelf without a
  purchase.”
- Append the current private reviewer access code to the instruction in Play
  Console. Keep the plaintext code out of source control and rotate it if it is
  disclosed.

## Ads

- Contains ads: **No**

## Data safety

- Does the app collect or share any required user data types? **No**
- Is all user data encrypted in transit? Not applicable because no user data is
  transmitted by the current app.
- Account creation/deletion questions: Not applicable; there are no accounts.

The app uses Google Play Billing for one permanent content unlock. Payment
details are collected directly by Google Play and are never available to
Moonlit Stories. The client receives purchase state and a purchase token from
Play, uses them only on the device to grant/restore access, and does not send
them to a developer-operated server.

This must be reassessed if any analytics, crash-reporting, advertising,
authentication, cloud storage, remote content, or another payment SDK is introduced.

## Target audience and content

- Target ages: **5 and under** and **6–8** (the in-app catalogue says ages 4–8)
- Children are part of the target audience: **Yes**
- Store listing intentionally appeals to children: **Yes**
- Ads: **No**

Because children are in the target audience, complete the Families section and
provide a public privacy policy. The current build avoids advertising IDs,
location, social features, user-generated content, and personal-data flows.

## Content rating

- Category: **Game**
- No ads, user interaction, location sharing, or unrestricted web access in the
  current build. It contains one non-consumable purchase.
- Review all story scenes before answering violence/fear questions. “The
  Tortoise and the Tiger” now presents the tiger as curious: he gently taps the
  shell, carries the tortoise, places him in the river, and cheers his swim. It
  contains no threat, attack, growl, or chase. “The Mouse and the Lion” still
  includes a trapped lion, so declare any applicable mild or fantasy content
  honestly wherever the questionnaire asks.
- Submit the calculated IARC rating; do not select a desired rating first and
  tailor answers to it.

## Other declarations

- News app: **No**
- Government app: **No**
- Financial features: **No**
- Health features: **No**
- Ads ID use: **No**
- App primarily provides web-browser functionality: **No**. It is a packaged,
  owned interactive game collection using a WebView runtime.

## Distribution suggestions

- Category: start with **Educational** under Games; change only if the intended
  positioning is primarily casual entertainment.
- Countries/regions: choose only markets where the publisher can support the
  listing, privacy obligations, and user communications.
- Pricing: the app is free to download and contains one permanent Play Billing
  purchase. An app first published as free cannot later be changed to paid.
