require("dotenv").config();
const fs = require("fs");
const {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} = require("discord.js");
const { MongoClient } = require("mongodb");

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;
const mongoUri = process.env.MONGO_URI;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
let mongoClient;

(async () => {
  try {
    mongoClient = new MongoClient(mongoUri, {
      useNewUrlParser: true,
    });
    await mongoClient.connect();
    client.mongoClient = mongoClient;
    console.log("Connected to MongoDB.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }

  const commandFolders = fs.readdirSync("./commands");
  const commands = [];

  for (const folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`./commands/${folder}`)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(`./commands/${folder}/${file}`);

      // Ensure the command uses the correct format and has `data`
      if (command.data && typeof command.data.toJSON === "function") {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      } else {
        console.warn(
          `Command ${file} is missing a valid 'data' property or 'toJSON' method.`
        );
      }
    }
  }

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("Refreshing application (/) commands.");

    const currentCommands = await rest.get(
      guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId)
    );

    const currentCommandNames = currentCommands.map((cmd) => cmd.name);
    const localCommandNames = commands.map((cmd) => cmd.name);

    for (const command of currentCommands) {
      if (!localCommandNames.includes(command.name)) {
        console.log(`Deleting command ${command.name}`);
        await rest.delete(
          guildId
            ? Routes.applicationGuildCommand(clientId, guildId, command.id)
            : Routes.applicationCommand(clientId, command.id)
        );
      }
    }

    await rest.put(
      guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }

  const eventFiles = fs
    .readdirSync("./events")
    .filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event && event.name && typeof event.execute === "function") {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } else {
      console.warn(
        `Event file ${file} is missing required 'name' or 'execute' function.`
      );
    }
  }

  client.login(token).catch((err) => {
    console.error("Discord login failed:", err);
    process.exit(1);
  });
})();
