const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  customId: "close_ticket",
  async execute(interaction, client) {
    try {
      const mongoClient = interaction.client.mongoClient;
      const db = mongoClient.db("ticketBotDB");
      const ticketsCollection = db.collection("tickets");
      const panelsCollection = db.collection("panels");

      const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
      const isAdmin = interaction.member.roles.cache.has(adminRoleId);

      if (!isAdmin) {
        return interaction.reply({
          content: "🚫 You do not have permission to close this ticket.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const channelId = interaction.channel.id;

      const ticket = await ticketsCollection.findOne({
        channelId,
        status: "open",
      });
      const panel = await panelsCollection.findOne({});

      if (!ticket || !panel) {
        await interaction.followUp({
          content: "❗ This ticket does not exist or has already been closed.",
          ephemeral: true,
        });
        return;
      }

      // Update ticket status to closed and save original name for later
      const originalName = interaction.channel.name;
      await ticketsCollection.updateOne(
        { channelId },
        { $set: { status: "closed", originalName } }
      );

      try {
        await interaction.channel.setName(`closed-${originalName}`);

        await interaction.channel.permissionOverwrites.edit(ticket.userId, {
          ViewChannel: false,
        });
        await interaction.channel.permissionOverwrites.edit(adminRoleId, {
          ViewChannel: true,
        });
      } catch (error) {
        console.error("Error updating channel name or permissions:", error);
        await interaction.followUp({
          content:
            "❗ There was an error updating the channel name or permissions.",
          ephemeral: true,
        });
        return;
      }

      // Send confirmation embed with action buttons
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

      // Ensure the follow-up is properly sent
      await interaction.followUp({
        content: "✅ Ticket closed successfully.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error closing ticket:", error);

      // Catch-all for failed interaction handling
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❗ There was an error closing the ticket.",
          ephemeral: true,
        });
      }
    }
  },
};
