const { EmbedBuilder } = require("discord.js");

module.exports = {
  async handleError(interaction, error) {
    const developerId = process.env.DEVELOPER_ID || "1234459679640522802";

    await interaction.followUp({
      content:
        "❗ The developer has been notified about the error. Please don't use this command for a while.",
      ephemeral: true,
    });

    const developer = await interaction.client.users.fetch(developerId);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🚨 Bot Error Notification")
      .setDescription(`An error occurred while executing a command or button.`)
      .addFields(
        {
          name: "User",
          value: `<@${interaction.user.id}> (${interaction.user.tag})`,
          inline: true,
        },
        {
          name: "Command/Button",
          value: `${interaction.commandName || interaction.customId}`,
          inline: true,
        },
        {
          name: "Guild",
          value: `${interaction.guild ? interaction.guild.name : "DM"}`,
          inline: true,
        },
        { name: "Error Message", value: `\`\`\`${error.message}\`\`\`` }
      )
      .setTimestamp()
      .setFooter({ text: "Check logs for more details." });

    try {
      await developer.send({ embeds: [errorEmbed] });
    } catch (sendError) {
      console.error(
        "Failed to send error notification to developer:",
        sendError
      );
    }

    console.error("Error occurred during interaction execution:", error);
  },
};
