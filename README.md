# Botify

A general Discord bot with tickets, giveaways, role commands, setup commands, and a simple token system.

## Features

- Ticket panel with buttons
- Role panel with self-role buttons
- Token shop panel with buy buttons
- Prefix commands using `?`
- Working `?help`
- Staff role command via `?role @user @role`
- Bulk role command via `?roleall @role`
- Self-role system via allowed roles
- Giveaway system with join/leave button, reroll, and manual end
- Per-server JSON configuration
- Slash commands for all main bot actions

## Installation

1. Install dependencies:

```powershell
npm.cmd install
```

2. Copy `.env.example` to `.env`.

3. Fill in `.env`:

- `DISCORD_TOKEN`: Your bot token
- `PREFIX`: Default fallback prefix, usually `?`
- `ENABLE_MESSAGE_CONTENT`: Keep this `true` for prefix commands
- `ENABLE_GUILD_MEMBERS`: Set this to `true` only if `SERVER MEMBERS INTENT` is enabled in the Discord Developer Portal
- `PANEL_IMAGE_URL`: Optional default image URL for the ticket panel

4. In the Discord Developer Portal:

- Enable `MESSAGE CONTENT INTENT`
- For `?roleall` and `/roleall`, enable `SERVER MEMBERS INTENT` and set `ENABLE_GUILD_MEMBERS=true`
- For `/to`, the bot needs `Moderate Members`
- For `/ban`, the bot needs `Ban Members`

## Start

```powershell
npm.cmd start
```

## Main Commands

- `?help`
- `?panel`
- `?queuepanel`
- `?rolepanel`
- `?shop`
- `?shoppanel`
- `?role @user @role`
- `?roleall @role`
- `?selfrole @role`
- `?roleme @role`
- `?giveaway <duration> <winners> <prize>`
- `?reroll <messageId>`
- `?endgiveaway <messageId>`
- `?tokens [@user]`
- `?addtokens @user <amount>`
- `?removetokens @user <amount>`
- `?pay @user <amount>`
- `?addshopitem @role <price>`
- `?removeshopitem @role`

## Slash Commands

- `/help`
- `/panel`
- `/queuepanel`
- `/rolepanel`
- `/shop`
- `/shoppanel`
- `/role`
- `/roleall`
- `/selfrole`
- `/roleme`
- `/tokens`
- `/addtokens`
- `/removetokens`
- `/pay`
- `/giveaway`
- `/to`
- `/ban`
- `/reroll`
- `/endgiveaway`
- `/setpanel`
- `/setsupportrole`
- `/setticketcategory`
- `/setprefix`
- `/addselfrole`
- `/removeselfrole`
- `/config`
- `/addshopitem`
- `/removeshopitem`

## Setup Commands

- `?setpanel`
- `?setsupportrole @role`
- `?setticketcategory <category>`
- `?setprefix <prefix>`
- `?addselfrole @role`
- `?removeselfrole @role`
- `?config`
- `?addshopitem @role <price>`
- `?removeshopitem @role`

## Storage

- Guild config is stored in [guild-configs.json](C:\Users\areic\OneDrive - BG BRG Kufstein\Dokumente\Discord Ticket bot\data\guild-configs.json)
- Token data is stored in [tokens.json](C:\Users\areic\OneDrive - BG BRG Kufstein\Dokumente\Discord Ticket bot\data\tokens.json)
- Active giveaways are stored in [giveaways.json](C:\Users\areic\OneDrive - BG BRG Kufstein\Dokumente\Discord Ticket bot\data\giveaways.json)
- Shop items are stored in [shop-items.json](C:\Users\areic\OneDrive - BG BRG Kufstein\Dokumente\Discord Ticket bot\data\shop-items.json)
- Main bot logic is in [bot.js](C:\Users\areic\OneDrive - BG BRG Kufstein\Dokumente\Discord Ticket bot\bot.js)
