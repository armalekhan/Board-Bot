module.exports = {
  name: "ping",
  description: "ping command sends the word 'pong' back",
  execute(message, args) {
    if (args[0] == "help") {
      message.channel.send(this.description);
    } else {
      message.channel.send(`Hi!, ${message.author}`);
    }
  },
};
