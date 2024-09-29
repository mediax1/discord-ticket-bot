const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Deletes the current ticket"),

  adminOnly: true,

  async execute(interaction) {
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

        // Send feedback request to the ticket owner via DM
        const user = await interaction.guild.members.fetch(ticket.userId);
        if (user) {
          await user.send({
            content: `🔒 Your ticket has been deleted. We would love to hear your feedback! Please use the command \`/feedback\` in any server channel to provide your feedback.`,
          });
          console.log(`Feedback request sent to ${user.user.tag}`);
        }
      } catch (error) {
        console.error("Error deleting ticket:", error);
      }
    }, 5000);
  },
};
