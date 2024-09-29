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
        return interaction.followUp({
          content: "❗ This ticket does not exist or has already been closed.",
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
        await interaction.channel.permissionOverwrites.edit(adminRoleId, {
          ViewChannel: true,
        });
      } catch (error) {
        console.error("Error editing channel permissions:", error);
        return interaction.followUp({
          content: "❗ There was an error updating the channel permissions.",
          ephemeral: true,
        });
      }

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

      // Follow-up confirmation message
      await interaction.followUp({
        content: "✅ The ticket has been closed successfully.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error closing ticket:", error);
      throw error;
    }
  },
};
