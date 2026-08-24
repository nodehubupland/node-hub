# Node Hub Discord Bot

Initial Discord server setup bot for Node Hub.

## What it creates

- Public categories and channels
- Private TEAM category
- Founder, Administrator, Lead Developer, Developer, Moderator, Partner, Verified, Uplander, Member and Bot roles
- Private team channels
- Private `event-log` channel
- `/setup-server` command
- `/node-status` command

## Setup

1. Create a Discord application in the Discord Developer Portal.
2. Create a Bot user and copy its token.
3. Enable the bot's required permissions when generating the invite. The bot needs permission to manage roles and channels.
4. Put the bot token, application client ID and optional server ID in a `.env` file inside this directory:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_client_id
DISCORD_GUILD_ID=your_server_id
```

5. Install dependencies:

```bash
npm install
```

6. Start the bot:

```bash
npm start
```

7. In the Discord server, run:

```text
/setup-server
```

The command requires Administrator permission.

## Security

Never commit `.env` or a Discord bot token to GitHub. If a token is exposed, rotate it immediately in the Discord Developer Portal.
