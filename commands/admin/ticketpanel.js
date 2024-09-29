const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Sets up a ticket panel in the specified channel.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where the ticket panel will be sent")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("categoryid")
        .setDescription("The ID of the category where tickets will be created")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("transcript_channel_id")
        .setDescription(
          "The ID of the channel where transcripts will be sent after tickets are closed"
        )
        .setRequired(true)
    ),

  adminOnly: true,

  async execute(interaction) {
    try {
      const adminRoleId = process.env.ADMIN_ROLE_ID || "YOUR_ADMIN_ROLE_ID";
      const isAdmin =
        interaction.member.permissions.has("Administrator") ||
        interaction.member.roles.cache.has(adminRoleId);

      if (!isAdmin) {
        return interaction.reply({
          content: "🚫 You do not have permission to use this command.",
          ephemeral: true,
        });
      }

      const panelChannel = interaction.options.getChannel("channel");
      const categoryId = interaction.options.getString("categoryid");
      const transcriptChannelId = interaction.options.getString(
        "transcript_channel_id"
      );

      if (!panelChannel.isTextBased()) {
        return interaction.reply({
          content: "❗ The specified channel is not a valid text channel.",
          ephemeral: true,
        });
      }

      const mongoClient = interaction.client.mongoClient;
      const db = mongoClient.db("ticketBotDB");
      const panelsCollection = db.collection("panels");

      await panelsCollection.deleteMany({});
      await panelsCollection.insertOne({
        categoryId: categoryId,
        transcriptChannelId: transcriptChannelId,
      });

      const embed = new EmbedBuilder()
        .setColor(0x1f8b4c)
        .setTitle("🎟️ Welcome to DarkEyes Store Support")
        .setDescription(
          `At **DarkEyes Store**, we offer the best deals on OTTs, software, keys, games, and much more!\n\nIf you have any issues or inquiries, feel free to open a support ticket by clicking the button below. Our support team will be with you shortly.`
        )
        .setThumbnail("https://i.postimg.cc/Ss2mpf93/logo.gif")
        .addFields(
          {
            name: "💡 How to Use",
            value:
              "1. Click the button below to create a ticket.\n2. Provide all necessary details.\n3. Our support team will get back to you as soon as possible.",
          },
          {
            name: "🛒 Shop with Us",
            value:
              "[Visit DarkEyes Store](https://darkeyesstore.com) for more exciting offers and products!",
          }
        )
        .setImage("https://i.postimg.cc/nzChhtyd/main.gif")
        .setFooter({
          text: "DarkEyes Store - Your one-stop shop for premium software and services.",
          iconURL: "https://i.postimg.cc/G36H9Hhv/logo.png",
        });

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("📩 Create Ticket")
          .setStyle(ButtonStyle.Primary)
      );

      await panelChannel.send({ embeds: [embed], components: [button] });

      await interaction.reply({
        content: `✅ Ticket panel has been successfully sent to ${panelChannel}.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error setting up ticket panel:", error);
      throw error;
    }
  },
};
