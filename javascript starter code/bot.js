const Discord = require('discord.js');
const auth = require('./auth.json');
var mongo = require('mongoose');
const client = new Discord.Client();
const User = require('./model/UserTemplate');

// Initialize MongoDB
mongo.connect(auth.mongo);

mongo.connection.on('connected' , () =>{
    console.log("MongoDB has been connected");
});
mongo.connection.on('err' , (err) =>{
    if (err){
        console.log("MongoDB Error has occured: "+err);
        return
    }
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!\n\n`);
});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
  });
  
  client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
  });



// Juicy stuff goes here

client.on('message', msg => {

    if (msg.author.bot) return;

    // msg.content = msg
    // Tho this sends through the server.

});


client.login(auth.token);