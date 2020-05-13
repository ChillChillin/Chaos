const Discord = require("discord.js");
const Attachment = Discord.Attachment;
const mjAPI = require("mathjax-node-svg2png");

mjAPI.config({
  MathJax: {},
});
mjAPI.start();
const typesetColour = "white";
module.exports.typeset = (tex) => {
  return new Promise((resolve, reject) => {
    const options = {
      math: `\\color{${typesetColour}}{${tex}}`,
      format: "TeX",
      png: true,
    };

    mjAPI.typeset(options, (result) => {
      if (!result.errors) {
        const pngString = result.png.replace(/^data:image\/png;base64,/, ""),
          image = Buffer.from(pngString, "base64");

        resolve(image);
      } else {
        reject(result.errors);
      }
    });
  });
};
module.exports.attachImages = (channel, images, message = false) => {
  const files = images.map(
    (elem, index) => new Attachment(elem, `file${index}.png`)
  );
  if (!message) {
    channel.send({ files: files });
  } else {
    channel.send(message, { files: files });
  }
};
module.exports.attachImage = (channel, image, message = false) => {
  module.exports.attachImages(channel, [image], message);
};
