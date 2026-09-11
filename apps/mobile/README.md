# Moonlit Stories for Android

This workspace packages the existing statically exported website and Three.js
stories inside a native Capacitor Android application. Game and website source
remain in their existing workspaces; `www/` is generated output and should not
be edited directly.

## Build and run

From the repository root:

```bash
npm run android:sync
npm run android:open
```

Regenerate legacy Android launcher icons after changing `assets/icon.svg`:

```bash
npm run assets:android --workspace=@moonlit/mobile
```

For a debug APK:

```bash
npm run android:debug
```

For a release Android App Bundle:

```bash
npm run android:bundle
```

Release builds require an upload key. Keep this key outside the repository and
back it up securely; do not commit the key or its passwords.

Create an upload key (once):

```bash
keytool -genkeypair -v \
  -keystore /secure/path/moonlit-upload.jks \
  -alias moonlit-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then provide the signing details to the build without putting passwords in a
tracked file:

```bash
export MOONLIT_UPLOAD_STORE_FILE="/secure/path/moonlit-upload.jks"
read -s "MOONLIT_UPLOAD_STORE_PASSWORD?Keystore password: "
printf '\n'
read -s "MOONLIT_UPLOAD_KEY_PASSWORD?Key password: "
printf '\n'
export MOONLIT_UPLOAD_STORE_PASSWORD MOONLIT_UPLOAD_KEY_PASSWORD
export MOONLIT_UPLOAD_KEY_ALIAS="moonlit-upload"
npm run android:bundle
```

The signed bundle is written to
`android/app/build/outputs/bundle/release/app-release.aab`. The first upload
should use Play App Signing so Google holds the app-signing key while this local
key remains the resettable upload key.

The Play Store preparation notes, listing copy, and declaration guidance live
in [`play-store/README.md`](play-store/README.md).

The Gradle runner uses `JAVA_HOME` when present and otherwise resolves the Java
installation behind the active `java` command. Android Studio can also build the
project directly with its bundled JDK.

## Product scope

- The Mouse and the Lion and The Crow and the Pitcher are included.
- The two tortoise stories are bundled but require the permanent Google Play
  product `premium_story_pack_1` in the native Android app.
- Purchases use Play Billing Library 9.1.0, restore from the installing Google
  account, and cache an entitlement for offline use.
- No Moonlit account, analytics, advertising, or sensitive device permission is
  added. The public website continues to provide all stories without the native
  Play purchase gate.
