const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Deletes the current ticket"),

  adminOnly: true,

  async execute(interaction) {
    try {
      const mongoClient = interaction.client.mongoClient;
      const db = mongoClient.db("ticketBotDB");
      const ticketsCollection = db.collection("tickets");

      const channelId = interaction.channel.id;
      const ticket = await ticketsCollection.findOne({ channelId });

      if (!ticket) {
        return interaction.reply({
          content: "❗ This ticket does not exist or has already been deleted.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      await interaction.followUp({
        content: "🗑️ Ticket will be deleted in 5 seconds...",
        ephemeral: true,
      });

      setTimeout(async () => {
        try {
          await ticketsCollection.deleteOne({ channelId });

          const channel = interaction.guild.channels.cache.get(channelId);
          if (channel) {
            await channel.delete();
            console.log(`Deleted ticket channel: ${channelId}`);
          }

          const user = await interaction.guild.members.fetch(ticket.userId);
          if (user) {
            const feedbackEmbed = new EmbedBuilder()
              .setColor(0xff4500)
              .setTitle("🔒 Ticket Closed")
              .setDescription(
                "Your ticket has been successfully **closed**. We'd love to hear from you to help improve our services!"
              )
              .addFields(
                {
                  name: "📋 Share Your Feedback",
                  value: `Please use the \`/feedback\` command in any server channel to let us know how we did! Your feedback helps us improve.`,
                },
                {
                  name: "💬 Need Further Assistance?",
                  value: `If you need more help, feel free to open a new ticket at any time. We're always here to help!`,
                }
              )
              .setFooter({
                text: "Thank you for reaching out to DarkEyes Store Support",
                iconURL: "https://i.postimg.cc/G36H9Hhv/logo.png",
              })
              .setTimestamp();

            await user.send({ embeds: [feedbackEmbed] });
            console.log(`Feedback request sent to ${user.user.tag}`);
          }
        } catch (error) {
          console.error(
            "Error deleting ticket or sending feedback request:",
            error
          );
          throw error;
        }
      }, 5000);
    } catch (error) {
      console.error("Error handling delete command:", error);
      throw error;
    }
  },
};
