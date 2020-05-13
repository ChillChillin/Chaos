const Discord = require("discord.js");
const client = new Discord.Client();
const Promise = require("bluebird");

const util = require("./util");
require("dotenv").config();

const startDelim = "latex$",
  endDelim = "$";

client.on("ready", () => {
  console.log("BOT IS READY!");
});

client.login(process.env.token).then(() => {});

client.on("message", (msg) => {
  if (msg.author === client.user || msg.author.bot) {
  } else if (msg.content.toLowerCase().startsWith("!latex ")) {
    const tex = msg.content.slice(6);
    util
      .typeset(tex)
      .then((image) => {
        util.attachImage(msg.channel, image);
      })
      .catch((err) => {
        msg.channel.send(err);
      });
  } else {
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
  }
});
