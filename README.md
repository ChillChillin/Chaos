# Chaos

Chaos is a discord bot that will convert latex commands to readable format. It also ships with common utility, moderation, and media features.

## Released Beta 0.5

to run modify your .env variable and then run the below commands

```
npm i
npm start
```

## Environment

- `token` (required): Discord bot token.
- `PREFIX` (optional): Command prefix (default: `!`).

## Commands

- `!help` - Show help.
- `!latex <tex>` - Render LaTeX to an image.
- `!ping` - Check latency.
- `!echo <text>` - Repeat a message.
- `!avatar [@user]` - Show a user's avatar.
- `!userinfo [@user]` - Show user info.
- `!serverinfo` - Show server info.
- `!clip [count]` - Create a text clip of recent messages.
- `!play <url>` - Play audio from a YouTube URL (requires FFmpeg and an Opus encoder installed on the host).
- `!skip` - Skip the current track.
- `!stop` - Stop playback and clear the queue.
- `!queue` - Show the current queue.
- `!np` - Show now playing.
- `!video <url>` - Show metadata for a YouTube URL.
- `!kick @user [reason]` - Kick a user (requires permission).
- `!ban @user [reason]` - Ban a user (requires permission).
