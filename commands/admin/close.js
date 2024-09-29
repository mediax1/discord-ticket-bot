const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Closes the current ticket"),

  adminOnly: true,

  async execute(interaction) {
    const mongoClient = interaction.client.mongoClient;
    const db = mongoClient.db("ticketBotDB");
    const ticketsCollection = db.collection("tickets");

    const channelId = interaction.channel.id;
    const ticket = await ticketsCollection.findOne({
      channelId,
      status: "open",
    });

    if (!ticket) {
      return interaction.reply({
        content: "❗ This ticket does not exist or is already closed.",
        ephemeral: true,
      });
    }

    await ticketsCollection.updateOne(
      { channelId },
      { $set: { status: "closed" } }
    );

    try {
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: false,
      });

      const closeEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🔒 Ticket Closed")
        .setDescription(
          "This ticket has been closed. You can either reopen it or delete it."
        );

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("delete_ticket")
          .setLabel("🗑️ Delete Ticket")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("reopen_ticket")
          .setLabel("🔓 Reopen Ticket")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.channel.send({
        embeds: [closeEmbed],
        components: [actionRow],
      });

      await interaction.reply({
        content: "✅ Ticket closed successfully.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error closing ticket:", error);
      return interaction.reply({
        content: "❗ There was an error closing the ticket.",
        ephemeral: true,
      });
    }
  },
};
