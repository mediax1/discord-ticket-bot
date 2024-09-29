const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reopen")
    .setDescription("Reopens the current ticket"),

  adminOnly: true,

  async execute(interaction) {
    const mongoClient = interaction.client.mongoClient;
    const db = mongoClient.db("ticketBotDB");
    const ticketsCollection = db.collection("tickets");

    const channelId = interaction.channel.id;
    const ticket = await ticketsCollection.findOne({
      channelId,
      status: "closed",
    });

    if (!ticket) {
      return interaction.reply({
        content: "❗ This ticket does not exist or is already open.",
        ephemeral: true,
      });
    }

    await ticketsCollection.updateOne(
      { channelId },
      { $set: { status: "open" } }
    );

    try {
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: true,
        SendMessages: true,
      });
      await interaction.reply({
        content: "✅ Ticket reopened successfully.",
        ephemeral: true,
      });

      await interaction.channel.send({
        content: "🔓 This ticket has been reopened.",
      });
    } catch (error) {
      console.error("Error reopening ticket:", error);
      return interaction.reply({
        content: "❗ There was an error reopening the ticket.",
        ephemeral: true,
      });
    }
  },
};
