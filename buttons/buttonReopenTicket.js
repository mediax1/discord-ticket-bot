const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  customId: "reopen_ticket",
  async execute(interaction, client) {
    const mongoClient = interaction.client.mongoClient;
    const db = mongoClient.db("ticketBotDB");
    const ticketsCollection = db.collection("tickets");

    const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
    const isAdmin = interaction.member.roles.cache.has(adminRoleId);

    if (!isAdmin) {
      return interaction.reply({
        content: "🚫 You do not have permission to reopen this ticket.",
        ephemeral: true,
      });
    }

    const channelId = interaction.channel.id;

    const ticket = await ticketsCollection.findOne({
      channelId,
      status: "closed",
    });
    if (!ticket) {
      return interaction.reply({
        content: "❗ This ticket is already open or does not exist.",
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
      await interaction.channel.permissionOverwrites.edit(adminRoleId, {
        ViewChannel: true,
      });
    } catch (error) {
      console.error("Error editing channel permissions:", error);
      return interaction.reply({
        content: "❗ There was an error updating the channel permissions.",
        ephemeral: true,
      });
    }

    await interaction.channel.send({
      content: "🔓 The ticket has been reopened.",
    });
    await interaction.reply({
      content: "✅ The ticket has been successfully reopened.",
      ephemeral: true,
    });
  },
};
