# ⚔️ Dungeon Quest RPG

A **free to play**, **free and open source** D&D-style dungeon crawler for Android
(and any modern browser). Pick a character class, learn spells, battle through
five dungeon rooms, buy gear at the shop, and face the Ancient Dragon.

No accounts, no ads, no in-app purchases. Your progress saves on your device.

## Play it

- **Right now:** open the playable page (link below) on your phone or computer.
- **Install on Android:** open the game in Chrome, tap menu **⋮ → Add to Home
  screen** (or "Install app"). It installs like a native app — fullscreen icon,
  works offline.

## Push it to GitHub

The repo is already initialized and committed — just create an empty repo named
`dungeon-quest-rpg` at [github.com/new](https://github.com/new) (under
BigWizard94, no README/license/gitignore since this repo has them), then:

```bash
cd dungeon-quest-rpg
git remote add origin https://github.com/BigWizard94/dungeon-quest-rpg.git
git push -u origin main
```

Want it hosted free? After pushing, go to the repo's **Settings → Pages** and
serve from the `main` branch. Your game will be live at
`https://bigwizard94.github.io/dungeon-quest-rpg/` — installable on Android
straight from there.

## Build a native Android app (APK)

The game is plain HTML/CSS/JS with no build step, so it runs anywhere. To wrap
it as a real APK with Capacitor:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Dungeon Quest RPG" com.example.dungeonquest --web-dir=.
npx cap add android
npx cap sync android
```

Then open the `android/` folder in **Android Studio** and choose
**Build → Build APK**. Sideload the APK on your phone to install.

## What's in this slice

- 3 character classes: Warrior, Mage, Rogue — each with unique stats
- 10 spells: Power Strike, War Cry, Second Wind (Warrior); Fireball, Frostbolt,
  Heal, Lightning (Mage); Backstab, Smoke Bomb, Poison Blade (Rogue)
- 5 dungeon rooms with 5 monsters + the Ancient Dragon boss
- A shop: potions, swords, shields, elixirs
- XP, levels, gold, save/resume on your device

Ideas for next slices: more dungeons, multiplayer, character art, sound,
achievements. Open an issue or send a pull request!

## License

MIT — free to play, free to share, free to modify. See [LICENSE](LICENSE).
