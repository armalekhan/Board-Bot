module.exports = {
  name: "gradePredict",
  description: "grade Predict",
  execute(message, args) {
    const filter = (m) => m.author.id === message.author.id;
    message.author.send("How many graded categories do you have? ");
    message.channel
      .awaitMessages(filter, {
        time: 4000,
        errors: ["time"],
      })
      .then((collected) => {
        console.log(collected.map());
      })
      .catch((err) => console.log(err));
  },
};
