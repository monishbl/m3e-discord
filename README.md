# M3E Discord

**Material 3 Expressive for Discord**, as a [Vencord](https://vencord.dev) theme layered on
[refact0r's Midnight](https://github.com/refact0r/midnight-discord): tonal islands, morphing M3E shapes, spring
motion, message bubbles with your own messages on the right, and a centred chat column.

![M3E Discord: design mockup](docs/img/hero.png)
<sub>Design mockup (`mockups/tonal-islands-v3.html`, shown with the blurple accent). The shipped default accent is Midnight cyan.</sub>

## Install

Vencord → Settings → **Themes** → **Online Themes**, paste one link:

| Variant | Link |
|---|---|
| **M3E Discord**: Midnight cyan on night blue-grey | `https://raw.githubusercontent.com/monishbl/m3e-discord/main/dist/m3e-midnight.theme.css` |
| **AMOLED**: pure black canvas | `https://raw.githubusercontent.com/monishbl/m3e-discord/main/dist/m3e-amoled.theme.css` |
| **Light**: daylight surfaces, expressive light accents | `https://raw.githubusercontent.com/monishbl/m3e-discord/main/dist/m3e-light.theme.css` |
| **Classic**: flat messages, inline chat bar, tighter spacing | `https://raw.githubusercontent.com/monishbl/m3e-discord/main/dist/m3e-classic.theme.css` |

Or download a file from [`dist/`](dist) into Vencord's themes folder (Themes → *Open Themes Folder*).
Enable **one** variant, and don't also enable Midnight: each file already imports it.
Keep Discord's own appearance on **Dark** (the Light variant repaints it).

### Your messages on the right

Discord doesn't mark who sent a message, so the theme finds yours by your user ID (it's in your avatar's URL).
Open the **[setup page](https://monishbl.github.io/m3e-discord/)**, paste your ID (Developer Mode → right-click yourself →
*Copy User ID*), and copy the snippet it generates into **QuickCSS**. It runs entirely in your browser.
It needs a custom avatar, and a run of more than 24 messages in a row falls back to the left.

![Classic layout mockup](docs/img/classic.png)

## Settings

Override these from **QuickCSS** so updates don't wipe them:

```css
:root {
  --m3e-bubbles: on;        /* on | off: off = classic flat messages */
  --m3e-accent: midnight;   /* midnight | blurple | lilac (dark variants) */
  --m3e-shapes: on;         /* on | off: M3E shapes on server icons */
  --m3e-chatbar: floating;  /* floating | inline */
  --m3e-mine: right;        /* right | left: where your messages go (needs the setup snippet) */
}
body {
  --gap: 8px;               /* space between panels */
  --m3e-island-radius: 28px;
  --m3e-bubble-max: 80%;    /* widest a bubble gets */
  --m3e-chat-max: 1280px;   /* centred width of the message column + chat bar; none = full width */
}
```

## What's inside

- **Shapes**: server icons are circles at rest, morph to a squircle when pressed, and the selected server becomes a
  cookie, flower or clover from the M3E shape library. Shapes are signed-distance fields ported from Material's shape
  shaders, ray-marched into 64-point `clip-path` polygons at build time.
- **Motion**: Material's expressive spring tokens (from Jetpack Compose `ExpressiveMotionTokens`) compiled to CSS
  `linear()` curves. Hover is a colour state layer only; press morphs shape on the no-bounce effects spring; only
  movement (the server pill, switches, menus) uses the overshooting spatial springs.
- **Components**: segmented channel/member lists, connected button groups, M3 switches, pill buttons, rounded menus,
  inverse tooltips, a floating chat bar, and the M3E loading shape as the typing indicator.
- **Messages**: grouped bubbles with mirrored corners for your own messages, accent rings on pings, and styled code,
  quotes, lists, embeds, files, polls and reactions.
- **Colour**: [material-color-utilities](https://github.com/material-foundation/material-color-utilities) "expressive"
  schemes seeded from Midnight's accent `#46aec5`; the dark surfaces keep Midnight's blue-grey.

## Build

```sh
node theme/build.mjs             # → dist/m3e-<variant>.theme.css
node theme/build.mjs --install   # also writes them into ~/.config/Vencord/themes/
```

- `theme/src/theme.css` is the source. It uses macros the build expands (`$shapes`, `$springs`, `$loaderframes`, `$mine`).
- `theme/variants/*.css` hold one override block per variant; each starts with its Vencord meta header.
- `theme/mine.mjs` builds the your-messages selector. Copy `theme/config.example.json` to `theme/config.json` (gitignored)
  with your ID and `--install` bakes it in, so you don't need the QuickCSS snippet.

### Live testing

Start Discord with `discord --remote-debugging-port=9222`, then:

- `node tools/cdp.mjs css dist/dev.css` injects the build on top of the running theme. `shot`, `mouse`, `eval` and
  `SIZE=940x600 …` are also available.
- `node tools/matched.mjs "<selector>"` shows which rules win, like DevTools' Styles pane.
- `NAV_A=… NAV_B=… node tools/navbench.mjs` measures the style/layout cost of switching pages.
- `node tools/cdp.mjs evalfile tools/contrast.js` lists visible text under 4.5:1 contrast.

Notes from building it:
- Never put `[class*="…"]` inside `:has()`, and never prefix many rules with a long selector. Compute a flag once
  (`--m3e-own`) and read it with `@container style(…)`. Both mistakes cost 90–250 ms per interaction.
- Discord's class names are build hashes (`_SY_P2T`…). When Discord updates, some selectors need refreshing.

## Credits & licence

MIT © monishbl. Built on [Midnight](https://github.com/refact0r/midnight-discord) by refact0r (MIT), imported at
runtime. Google Sans Flex / Google Sans Code are loaded from Google Fonts. The mockups bundle Google Sans Flex under
the SIL Open Font License (`mockups/fonts/`). Colour schemes come from Google's material-color-utilities (Apache-2.0).
Not affiliated with Discord or Google.
