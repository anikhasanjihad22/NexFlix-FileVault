# NexFlix FileVault

A production-ready Telegram file-sharing bot. Admins upload files to the bot;
the bot generates unique deep links; users who tap those links must join a
set of required channels/groups before the file is delivered. Delivered
messages self-destruct after 10 minutes, but the underlying share link keeps
working forever (the database record is never touched).

Everything happens inside Telegram — there is no website, Mini App, or
external download page involved anywhere in the user flow.

## Features

- 🔗 Unique deep links per file: `https://t.me/NexFlixFileVaultBot?start=TOKEN`
- 🔐 Force-join gate against 3 required chats, re-verified live on every attempt
- 📦 Batch links — one link delivers multiple files
- ⏱ Auto-delete of delivered file messages after 10 minutes (DB record kept)
- 🔒 Private-chat only - the bot silently ignores all group/supergroup/channel activity (no replies, ever), so it never spams a group it's added to
- 🆔 /myid (and /whoami) - anyone can quickly get their own Telegram user ID, handy for admins running /ban or /addadmin
- 🔧 /maintenance on|off (owner-only) - puts the bot in maintenance mode for regular users (admins unaffected) during deploys/incidents
- 📬 Owner gets a DM the moment the bot comes online after a deploy
- 📋 Copy-link button on every /genlink and batch result (Telegram's native clipboard-copy button)
- ⏸️▶️✅ Button-driven batch flow (Pause / Resume / Generate Link - no /done needed)
- 🗑 Admin-only Delete button under delivered files (regular users only ever see Forward)
- 💾 Storage-used total in /stats (sum of stored files' sizes)
- ↗️ Working "Forward" button (uses Telegram inline mode)
- 🛡 Admin system backed by MongoDB, with an un-removable owner
- 📣 Rate-limited broadcast to all known users
- 🚫 Ban/unban system
- 📊 Live stats (users, files, downloads, admins, banned users)
- 🖼 Configurable welcome image with automatic `file_id` caching

## Project Structure

```
src/
  index.js          Entry point: DB connect → admin bootstrap → bot launch → health server
  bot.js             Wires all middleware/commands/handlers together
  config.js          Loads and validates all environment variables
  database.js        MongoDB connection
  middleware/
    adminOnly.js      adminOnly / ownerOnly guards
    banCheck.js        banCheck + trackUser (user analytics)
  commands/
    start.js           /start, welcome message, deep-link entry point
    aboutHelp.js        /about, /help
    genlink.js          /genlink (single file upload flow)
    batch.js             /batch, /done, /cancel (multi-file upload flow)
    broadcast.js         /broadcast
    stats.js              /stats
    files.js               /files
    deleteFile.js           /delete
    ban.js                   /ban, /unban
    admins.js                 /addadmin, /removeadmin, /admins
  handlers/
    deepLink.js         Membership gate + file delivery + auto-delete scheduling
    callbacks.js          Inline button taps (menu nav, Verify Membership)
    inlineShare.js          Powers the Forward button via Telegram inline mode
  models/
    User.js, Admin.js, File.js, Settings.js, BannedUser.js
```

## Setup

### 1. Create the bot

1. Talk to [@BotFather](https://t.me/BotFather), run `/newbot`, and grab your `BOT_TOKEN`.
2. Run `/setinline` on BotFather for this bot and set any placeholder text
   (e.g. "Loading file…"). This is **required** for the Forward button to work.
3. Optionally run `/setuserpic` to set the bot's profile picture to your NexFlix logo.

### 2. Make the bot an admin in your chats

The bot must be an **administrator** in:
- Main Channel (`@rnexflix`)
- Daily Update channel (`-1002674103217`)
- Request Group (`-1003666151699`)

Without admin rights, `getChatMember` calls will fail and the membership
check will always report "not joined" for that chat.

### 3. Get the Daily Update invite link

The spec only provided the Daily Update chat ID, not a public username or
invite link. Since it's a private chat, Telegram inline **URL buttons** need
an actual invite link (a chat ID alone can't be turned into a `t.me` link).
Get one from that channel's *Invite Links* settings and set it as
`DAILY_UPDATE_INVITE_LINK` in your environment. Until it's set, the bot will
still enforce membership in that chat, but the "Join" button for it won't be shown.

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in `BOT_TOKEN` and `MONGODB_URI` at minimum:

```bash
cp .env.example .env
```

### 5. Install and run

```bash
npm install
npm start
```

On first successful `/start`, the bot sends the welcome photo from
`WELCOME_IMAGE_URL` and logs the resulting Telegram `file_id` into the
`settings` collection automatically — no manual step needed. If you'd rather
pin it via environment variable instead, grab the `file_id` from the logs or
database and set `WELCOME_IMAGE_FILE_ID`.

## Deploying to Render

This repo includes `render.yaml` for a one-click Blueprint deploy:

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint**, point it at the repo.
3. Fill in the `sync: false` secrets (`BOT_TOKEN`, `MONGODB_URI`,
   `DAILY_UPDATE_INVITE_LINK`) in the Render dashboard.
4. Deploy. The bot runs via **long polling** (no webhook/public URL needed
   for Telegram), and a tiny Express server on `$PORT` exists purely so
   Render's health check sees the service as alive.

## Admin Commands

| Command | Access | Description |
|---|---|---|
| `/genlink` | Admin | Upload a single file, get back a share link |
| `/batch` → send files → tap ✅ Generate Link | Admin | Upload multiple files under one share link |
| `/cancel` | Admin | Abort an in-progress `/batch` session |
| `/broadcast <text>` or reply `/broadcast` | Admin | Message all known users |
| `/stats` | Admin | Users, files, downloads, admins, banned counts |
| `/files [page]` | Admin | List stored files with their slugs |
| `/delete <slug>` | Admin | Deactivate a file (its link then shows "Not Found") |
| `/ban <user_id> [reason]` | Admin | Block a user from receiving files |
| `/unban <user_id>` | Admin | Remove a ban |
| `/myid` | Everyone | Shows your own Telegram user ID |
| `/maintenance [on\|off]` | Owner only | Toggle maintenance mode |
| `/addadmin <user_id>` | Owner only | Grant admin access |
| `/removeadmin <user_id>` | Owner only | Revoke admin access (owner is protected) |
| `/admins` | Admin | List current admins |

## How File Delivery Works

1. Admin runs `/genlink`, sends a file → bot stores `file_id` + metadata in
   MongoDB and returns `https://t.me/NexFlixFileVaultBot?start=TOKEN`.
2. A user opens that link → Telegram sends the bot `/start TOKEN`.
3. Bot looks up the file by token, then calls `getChatMember` against all
   three required chats.
4. If any chat is missing, the bot shows Join buttons + a **Verify Membership**
   button and remembers what the user was trying to unlock.
5. Once verified, the bot sends the file, schedules its own message for
   deletion in 10 minutes (`AUTO_DELETE_SECONDS`), and increments the file's
   download counter. The MongoDB file record is never deleted by this process.
6. The same link keeps working for any future user who passes the membership check.

## Notes on Design Decisions

- **Forwarding**: `protect_content` is never set, so users can always
  long-press → Forward manually. The in-message **Forward** button is a real,
  working feature built on Telegram's inline mode (`switch_to_chat` +
  `answerInlineQuery` with a cached file result) — it is not a fake button.
- **Pending unlock state** (which file a user was mid-verifying) is kept
  in-memory for simplicity. If you scale this bot to multiple processes/dynos,
  move `pendingUnlock` in `handlers/deepLink.js` into MongoDB or Redis.
- **Colored buttons**: Since **Bot API 9.4** (Feb 2026), Telegram supports a
  `style` field on buttons (`primary` blue, `success` green, `danger` red).
  This bot uses it: navigation/join buttons are blue, and the
  Verify Membership / Forward buttons are green. Older Telegram client
  versions that predate 9.4 will simply ignore the field and show the
  default button style - nothing breaks.
