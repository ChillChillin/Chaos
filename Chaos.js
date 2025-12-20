const Discord = require("discord.js");
const client = new Discord.Client();
const Promise = require("bluebird");
const ytdl = require("ytdl-core");

const util = require("./util");
require("dotenv").config();

const startDelim = "latex$",
  endDelim = "$";
const prefix = process.env.PREFIX || "!";
const queues = new Map();

const commandList = [
  ["help", "Show this help message."],
  ["ping", "Check bot latency."],
  ["latex <tex>", "Render LaTeX to an image."],
  ["echo <text>", "Repeat a message."],
  ["avatar [@user]", "Show a user's avatar."],
  ["userinfo [@user]", "Show user info."],
  ["serverinfo", "Show server info."],
  ["clip [count]", "Create a text clip of recent messages."],
  ["play <url>", "Play audio from a YouTube URL."],
  ["skip", "Skip the current track."],
  ["stop", "Stop playback and clear the queue."],
  ["queue", "Show the current queue."],
  ["np", "Show now playing."],
  ["video <url>", "Show metadata for a video URL."],
  ["kick @user [reason]", "Kick a user (requires permission)."],
  ["ban @user [reason]", "Ban a user (requires permission)."],
];

client.on("ready", () => {
  console.log("BOT IS READY!");
});

client.login(process.env.token).then(() => {});

const sendHelp = (msg) => {
  const lines = commandList.map(
    ([cmd, desc]) => `\`${prefix}${cmd}\` - ${desc}`
  );
  msg.channel.send(
    [
      "**Chaos Bot Commands**",
      "Prefix is configurable via `PREFIX` env var.",
      "",
      ...lines,
    ].join("\n")
  );
};

const enqueue = (msg, url) => {
  if (!ytdl.validateURL(url)) {
    msg.channel.send("Please provide a valid YouTube URL.");
    return;
  }
  const queue = queues.get(msg.guild.id) || {
    guildId: msg.guild.id,
    textChannel: msg.channel,
    voiceChannel: null,
    connection: null,
    songs: [],
    playing: false,
  };
  queue.textChannel = msg.channel;
  queue.songs.push(url);
  queues.set(msg.guild.id, queue);
  if (!queue.playing) {
    playNext(msg, queue);
  } else {
    msg.channel.send(`Queued: ${url}`);
  }
};

const playNext = (msg, queue) => {
  const song = queue.songs[0];
  if (!song) {
    queue.playing = false;
    queue.voiceChannel = null;
    if (queue.connection) {
      queue.connection.disconnect();
    }
    queues.delete(queue.guildId);
    return;
  }
  const voiceChannel = msg.member.voiceChannel;
  if (!voiceChannel) {
    msg.channel.send("Join a voice channel first.");
    queue.songs.shift();
    playNext(msg, queue);
    return;
  }
  queue.voiceChannel = voiceChannel;
  queue.playing = true;
  voiceChannel
    .join()
    .then((connection) => {
      queue.connection = connection;
      const dispatcher = connection.playStream(
        ytdl(song, { filter: "audioonly" })
      );
      msg.channel.send(`Now playing: ${song}`);
      dispatcher.on("end", () => {
        queue.songs.shift();
        playNext(msg, queue);
      });
      dispatcher.on("error", (err) => {
        msg.channel.send(`Playback error: ${err.message}`);
        queue.songs.shift();
        playNext(msg, queue);
      });
    })
    .catch((err) => {
      msg.channel.send(`Failed to join voice channel: ${err.message}`);
    });
};

client.on("message", (msg) => {
  if (msg.author === client.user || msg.author.bot) {
    return;
  }

  if (msg.content.startsWith(prefix)) {
    const args = msg.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    if (command === "help") {
      return sendHelp(msg);
    }
    if (command === "ping") {
      return msg.channel.send(
        `Pong! ${Math.round(client.ping)}ms`
      );
    }
    if (command === "latex") {
      const tex = args.join(" ");
      if (!tex) {
        return msg.channel.send("Provide LaTeX content to render.");
      }
      return util
        .typeset(tex)
        .then((image) => {
          util.attachImage(msg.channel, image);
        })
        .catch((err) => {
          msg.channel.send(err);
        });
    }
    if (command === "echo") {
      const text = args.join(" ");
      if (!text) {
        return msg.channel.send("Provide text to echo.");
      }
      return msg.channel.send(text);
    }
    if (command === "avatar") {
      const user = msg.mentions.users.first() || msg.author;
      return msg.channel.send(user.displayAvatarURL);
    }
    if (command === "userinfo") {
      const user = msg.mentions.users.first() || msg.author;
      const member = msg.guild ? msg.guild.member(user) : null;
      const lines = [
        `**User:** ${user.tag}`,
        `**ID:** ${user.id}`,
        `**Joined Discord:** ${user.createdAt.toDateString()}`,
      ];
      if (member) {
        lines.push(`**Joined Server:** ${member.joinedAt.toDateString()}`);
        lines.push(`**Roles:** ${member.roles.map((r) => r.name).join(", ")}`);
      }
      return msg.channel.send(lines.join("\n"));
    }
    if (command === "serverinfo") {
      if (!msg.guild) {
        return msg.channel.send("Server info is only available in servers.");
      }
      const guild = msg.guild;
      const lines = [
        `**Server:** ${guild.name}`,
        `**ID:** ${guild.id}`,
        `**Members:** ${guild.memberCount}`,
        `**Owner:** ${guild.owner ? guild.owner.user.tag : "Unknown"}`,
        `**Created:** ${guild.createdAt.toDateString()}`,
      ];
      return msg.channel.send(lines.join("\n"));
    }
    if (command === "clip") {
      if (!msg.guild) {
        return msg.channel.send("Clips are only available in servers.");
      }
      const count = Math.min(parseInt(args[0], 10) || 10, 50);
      return msg.channel
        .fetchMessages({ limit: count })
        .then((messages) => {
          const lines = messages
            .map(
              (m) =>
                `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`
            )
            .reverse();
          const buffer = Buffer.from(lines.join("\n"), "utf8");
          const attachment = new Discord.Attachment(buffer, "clip.txt");
          return msg.channel.send("Here is your clip:", { files: [attachment] });
        })
        .catch((err) => msg.channel.send(err.message));
    }
    if (command === "play") {
      if (!msg.guild) {
        return msg.channel.send("Music commands are only available in servers.");
      }
      const url = args[0];
      if (!url) {
        return msg.channel.send("Provide a YouTube URL to play.");
      }
      return enqueue(msg, url);
    }
    if (command === "skip") {
      if (!msg.guild) {
        return msg.channel.send("Music commands are only available in servers.");
      }
      const queue = queues.get(msg.guild.id);
      if (!queue || !queue.connection) {
        return msg.channel.send("Nothing is playing.");
      }
      queue.connection.dispatcher.end();
      return msg.channel.send("Skipped.");
    }
    if (command === "stop") {
      if (!msg.guild) {
        return msg.channel.send("Music commands are only available in servers.");
      }
      const queue = queues.get(msg.guild.id);
      if (!queue || !queue.connection) {
        return msg.channel.send("Nothing is playing.");
      }
      queue.songs = [];
      queue.connection.dispatcher.end();
      return msg.channel.send("Stopped playback.");
    }
    if (command === "queue") {
      if (!msg.guild) {
        return msg.channel.send("Music commands are only available in servers.");
      }
      const queue = queues.get(msg.guild.id);
      if (!queue || queue.songs.length === 0) {
        return msg.channel.send("Queue is empty.");
      }
      const lines = queue.songs.map((song, index) => {
        if (index === 0) {
          return `**Now:** ${song}`;
        }
        return `${index}. ${song}`;
      });
      return msg.channel.send(lines.join("\n"));
    }
    if (command === "np") {
      if (!msg.guild) {
        return msg.channel.send("Music commands are only available in servers.");
      }
      const queue = queues.get(msg.guild.id);
      if (!queue || queue.songs.length === 0) {
        return msg.channel.send("Nothing is playing.");
      }
      return msg.channel.send(`Now playing: ${queue.songs[0]}`);
    }
    if (command === "video") {
      const url = args[0];
      if (!url || !ytdl.validateURL(url)) {
        return msg.channel.send("Provide a valid YouTube URL.");
      }
      return ytdl
        .getInfo(url)
        .then((info) => {
          const details = info.player_response.videoDetails;
          const lines = [
            `**Title:** ${details.title}`,
            `**Author:** ${details.author}`,
            `**Length:** ${Math.round(details.lengthSeconds / 60)} minutes`,
            `**Views:** ${details.viewCount}`,
          ];
          return msg.channel.send(lines.join("\n"));
        })
        .catch((err) => msg.channel.send(err.message));
    }
    if (command === "kick") {
      if (!msg.guild) {
        return msg.channel.send("Kick is only available in servers.");
      }
      const member = msg.mentions.members.first();
      if (!member) {
        return msg.channel.send("Mention a user to kick.");
      }
      if (!msg.member.hasPermission("KICK_MEMBERS")) {
        return msg.channel.send("You do not have permission to kick.");
      }
      const reason = args.slice(1).join(" ") || "No reason provided.";
      return member
        .kick(reason)
        .then(() => msg.channel.send(`Kicked ${member.user.tag}.`))
        .catch((err) => msg.channel.send(err.message));
    }
    if (command === "ban") {
      if (!msg.guild) {
        return msg.channel.send("Ban is only available in servers.");
      }
      const member = msg.mentions.members.first();
      if (!member) {
        return msg.channel.send("Mention a user to ban.");
      }
      if (!msg.member.hasPermission("BAN_MEMBERS")) {
        return msg.channel.send("You do not have permission to ban.");
      }
      const reason = args.slice(1).join(" ") || "No reason provided.";
      return member
        .ban(reason)
        .then(() => msg.channel.send(`Banned ${member.user.tag}.`))
        .catch((err) => msg.channel.send(err.message));
    }
    return msg.channel.send("Unknown command. Try `!help`.");
  }

  const texStrings = msg.content.split(startDelim);

  if (texStrings.length !== 1) {
    texStrings.shift();

    const promises = texStrings.map((elem) => {
      const end = elem.indexOf(endDelim),
        tex = elem.slice(0, end);
      return util.typeset(tex);
    });
    Promise.all(promises)
      .then((images) => {
        util.attachImages(msg.channel, images, "LaTeX detected:");
      })
      .catch((err) => {
        msg.channel.send(err);
      });
  }
});
