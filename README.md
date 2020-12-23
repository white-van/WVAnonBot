# WVAnonBot

UTM White Van's Anonymous message bot.

Features:

- Supports sending messages to two channels (anon-msgs and deep-talks) which can be configured
- Ban users
- Anonymity for users
- Slow mode

## Getting Started

Requires: <a href="https://nodejs.org/en/">Node.js</a>

1. <a href="https://discordpy.readthedocs.io/en/latest/discord.html">Create a Discord Bot Account</a>
2. Create an auth.json file and paste in your token
   `touch auth.json`

```
    {
        "token": "${YOUR TOKEN HERE}"
    }
```

You will need to fill out `auth.json` or `config.env`.

3. `cd nodejsbot && npm install`

4. `node bot.js` to run the bot!

5. Create three channels: one for logs, one for anon-messages, one for deep-talks (you will need administrator privileges in your discord server)

6. !anon set log #[log-channel]

7. !anon set anon #[anon-msgs]

8. !anon set deeptalks #[deep-talks]

9. You're good to go!

## Contributing

1. Fork the repo
2. Branch off main
3. Create a pull request from your fork into main
