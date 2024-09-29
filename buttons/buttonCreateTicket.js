const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  customId: "create_ticket",
  async execute(interaction, client) {
    try {
      const mongoClient = interaction.client.mongoClient;
      const db = mongoClient.db("ticketBotDB");
      const panelsCollection = db.collection("panels");
      const ticketsCollection = db.collection("tickets");

      const existingTicket = await ticketsCollection.findOne({
        userId: interaction.user.id,
        status: "open",
      });
      if (existingTicket) {
        return interaction.reply({
          content: "🚨 You already have an open ticket!",
          ephemeral: true,
        });
      }

      const panelData = await panelsCollection.findOne();
      if (!panelData) {
        return interaction.reply({
          content:
            "❗ Category ID not found. Please set up the ticket panel again.",
          ephemeral: true,
        });
      }
      const categoryId = panelData.categoryId;

      const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
      const adminRole = interaction.guild.roles.cache.get(adminRoleId);
      if (!adminRole) {
        return interaction.reply({
          content: "❗ Admin role not found. Please check the role ID.",
          ephemeral: true,
        });
      }

      const username = interaction.user.username;

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${username}`,
        type: 0,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
          {
            id: adminRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
        ],
      });

      await ticketsCollection.insertOne({
        userId: interaction.user.id,
        channelId: ticketChannel.id,
        status: "open",
        ticketName: `ticket-${username}`,
      });

      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`🎫 Welcome to your ticket, ${username}!`)
        .setDescription(
          `📩 A staff member will be with you shortly.\n\n👤 **Ping:** <@${interaction.user.id}> and <@&${adminRoleId}>`
        );

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("🔒 Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: `👤 <@${interaction.user.id}> 🔔 <@&${adminRoleId}>`,
        embeds: [welcomeEmbed],
        components: [closeButton],
      });

      await interaction.reply({
        content: `🎟️ Your ticket has been created: ${ticketChannel}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error creating the ticket channel:", error);
      throw error;
    }
  },
};
