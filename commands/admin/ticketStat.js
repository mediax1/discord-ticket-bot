const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketstats")
    .setDescription("Displays ticket statistics for the server"),

  adminOnly: true,

  async execute(interaction) {
    try {
      const mongoClient = interaction.client.mongoClient;
      const db = mongoClient.db("ticketBotDB");
      const ticketsCollection = db.collection("tickets");

      const openTicketsCount = await ticketsCollection.countDocuments({
        status: "open",
      });
      const closedTicketsCount = await ticketsCollection.countDocuments({
        status: "closed",
      });
      const totalTicketsCount = await ticketsCollection.countDocuments({});

      const statsEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🎟️ Ticket Statistics")
        .addFields(
          { name: "Open Tickets", value: `${openTicketsCount}`, inline: true },
          {
            name: "Closed Tickets",
            value: `${closedTicketsCount}`,
            inline: true,
          },
          { name: "Total Tickets", value: `${totalTicketsCount}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    } catch (error) {
      console.error("Error fetching ticket statistics:", error);
      throw error;
    }
  },
};
