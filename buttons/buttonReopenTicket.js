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

    // Update ticket status to open and revert the channel name
    await ticketsCollection.updateOne(
      { channelId },
      { $set: { status: "open" } }
    );

    try {
      const user = await interaction.guild.members.fetch(ticket.userId);
      const adminRole = interaction.guild.roles.cache.get(adminRoleId);

      if (!user) {
        return interaction.reply({
          content: "❗ Ticket creator not found.",
          ephemeral: true,
        });
      }

      if (!adminRole) {
        return interaction.reply({
          content: "❗ Admin role not found.",
          ephemeral: true,
        });
      }

      // Revert the channel name back to its original state
      const originalName = ticket.ticketName; // Original name stored when the ticket was closed
      await interaction.channel.setName(originalName);

      // Update the permission overwrites
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
      });

      await interaction.channel.permissionOverwrites.edit(adminRole.id, {
        ViewChannel: true,
      });

      await interaction.channel.send({
        content: "🔓 The ticket has been reopened.",
      });

      await interaction.reply({
        content: "✅ The ticket has been successfully reopened.",
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        "Error editing channel permissions or renaming the channel:",
        error
      );
      throw error;
    }
  },
};
