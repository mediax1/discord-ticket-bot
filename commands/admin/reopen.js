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

    let user;
    try {
      user = await interaction.guild.members.fetch(ticket.userId);
    } catch (error) {
      console.error("Error fetching user:", error);
      return interaction.reply({
        content:
          "❗ Could not fetch the ticket owner. They may have left the server.",
        ephemeral: true,
      });
    }

    const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
    const adminRole = interaction.guild.roles.cache.get(adminRoleId);
    if (!adminRole) {
      return interaction.reply({
        content: "❗ Admin role not found. Please check the role ID.",
        ephemeral: true,
      });
    }

    await ticketsCollection.updateOne(
      { channelId },
      { $set: { status: "open" } }
    );

    try {
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
      });

      await interaction.channel.permissionOverwrites.edit(adminRole.id, {
        ViewChannel: true,
      });

      await interaction.reply({
        content: "✅ Ticket reopened successfully.",
        ephemeral: true,
      });

      await interaction.channel.send({
        content: "🔓 This ticket has been reopened.",
      });
    } catch (error) {
      console.error("Error reopening ticket permissions:", error);
      throw error;
    }
  },
};
