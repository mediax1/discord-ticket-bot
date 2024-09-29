const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Submit feedback for a deleted ticket")
    .addIntegerOption((option) =>
      option
        .setName("rating")
        .setDescription("Rate your experience (1-5)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("comments")
        .setDescription("Leave additional comments")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const rating = interaction.options.getInteger("rating");
      const comments =
        interaction.options.getString("comments") || "No additional comments.";

      if (rating < 1 || rating > 5) {
        return interaction.reply({
          content: "❗ Please provide a rating between 1 and 5.",
          ephemeral: true,
        });
      }

      const mongoClient = interaction.client.mongoClient;
      const db = mongoClient.db("ticketBotDB");
      const feedbackCollection = db.collection("feedback");

      await feedbackCollection.insertOne({
        userId: interaction.user.id,
        rating: rating,
        comments: comments,
        timestamp: new Date(),
      });

      await interaction.reply({
        content: "✅ Thank you for your feedback! We appreciate your input.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error;
    }
  },
};
