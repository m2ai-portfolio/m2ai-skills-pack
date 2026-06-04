---
name: remote-channels
description: Set up and configure Claude Code remote access via Telegram and Discord channels. Guides through bot creation, plugin installation, security lockdown, and always-on configuration.
---

# Remote Channels Setup

Configure Claude Code for remote access via Telegram and/or Discord messaging platforms.

## Prerequisites

- Claude Code latest version (channel support required)
- Telegram app installed (for Telegram setup)
- Discord account with server admin access (for Discord setup)

## Phase 1: Telegram Setup

1. Open Telegram and message **@BotFather**
2. Send `/newbot`, provide a name and bot username
3. Copy the bot token provided by BotFather
4. Install the Telegram channel plugin in Claude Code:
   ```bash
   claude plugins install claude-plugins-official/telegram
   ```
5. Store the bot token in the environment file Claude Code creates
6. Restart terminal session so the plugin loads into context

## Phase 2: Discord Setup

1. Go to https://discord.com/developers/applications and create a new application
2. Under **OAuth2**, add a redirect URL (any dummy URL works)
3. Under **Bot**, configure permissions:
   - View Channels
   - Send Messages
   - Send Messages in Threads
   - Read Message History
   - Attach Files
   - Add Reactions
4. Disable **Requires OAuth2 Code Grant** under Bot settings
5. Enable **Message Content Intent** under Bot settings
6. Generate an invite URL with the selected permissions and paste it in a browser to add the bot to your server
7. Install the Discord channel plugin in Claude Code:
   ```bash
   claude plugins install claude-plugins-official/discord
   ```

## Phase 3: Launch Remote Session

Run from a **standard terminal** (not inside Claude Code):

```bash
# Telegram
claude --channel telegram --plugin claude-plugins-official/telegram

# Discord
claude --channel discord --plugin claude-plugins-official/discord
```

## Phase 4: Security Lockdown

Lock access to your user ID only:

```bash
# Telegram - restrict to your Telegram user ID
/telegram access-policy allowlist

# Discord - restrict to your Discord user ID
/discord access-policy
```

## Phase 5: Always-On (Optional)

For persistent availability, run as a background process:

```bash
# Using nohup
nohup claude --channel telegram --plugin claude-plugins-official/telegram &

# Or use pm2/systemd for process management
pm2 start "claude --channel telegram --plugin claude-plugins-official/telegram" --name claude-telegram
```

## Gotchas

- **Permissions mode**: By default, runs in accept-edits mode (asks permission for every action). Override explicitly if needed, but be aware of security implications.
- **File attachments**: File sending may be blocked by default. Check terminal output if the bot starts typing then stops.
- **Telegram limits**: No message history API, 50MB file limit, no built-in conversation persistence.
- **Discord advantage**: Can fetch last 100 messages, providing better conversation continuity.
- **Session lifecycle**: Remote session only receives messages while Claude Code is running.

## Verification

- [ ] Bot responds to messages in the chosen platform
- [ ] Access policy restricts to your user ID only
- [ ] File attachments send successfully (if enabled)
- [ ] Session persists across terminal reconnects (if always-on configured)

## Source

Technique extracted from Mark Kashef, "Did Claude Code Just Make OpenClaw Obsolete?", March 20, 2026.
https://www.youtube.com/watch?v=RUyqEAXt2YQ
