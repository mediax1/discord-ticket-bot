const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
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

    const user = await interaction.guild.members.fetch(ticket.userId);
    const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
    const adminRole = interaction.guild.roles.cache.get(adminRoleId);

    if (!user) {
      return interaction.reply({
        content: "❗ Could not find the ticket owner.",
        ephemeral: true,
      });
    }

    if (!adminRole) {
      return interaction.reply({
        content: "❗ Could not find the admin role.",
        ephemeral: true,
      });
    }

    // Store original channel name and update ticket status
    const originalName = interaction.channel.name;
    await ticketsCollection.updateOne(
      { channelId },
      { $set: { status: "closed", originalName } }
    );

    // Try renaming the channel and updating permissions
    try {
      await interaction.channel.setName(`closed-${originalName}`);
    } catch (error) {
      console.error("Error renaming channel:", error);

      if (error.code === 50035) {
        await interaction.followUp({
          content:
            "⚠️ Could not rename the channel due to Discord rate limits.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: "⚠️ There was an error renaming the channel.",
          ephemeral: true,
        });
      }
    }

    try {
      // Update permission overwrites
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: false,
      });

      await interaction.channel.permissionOverwrites.edit(adminRole.id, {
        ViewChannel: true,
      });

      // Embed and buttons for closed ticket
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

      // Confirm closure
      await interaction.reply({
        content: "✅ Ticket closed successfully.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error closing ticket:", error);

      // Inform user if there was an issue
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❗ There was an error closing the ticket.",
          ephemeral: true,
        });
      }
    }
  },
};
