# 🤫🤖 WVAnonBot

WVAnon is a Discord bot developed by the UTM White Van Discord to enable users to send anonymous messages. We tried <a href="https://disforge.com/bot/288-juzoconfession">JuzoConfession</a> and <a href="https://nminchow.github.io/VoltaireWeb/">Voltaire</a>, but neither of them satisfied us in terms of usability, security, and privacy.

As of December 22nd, 2020, 2300 anonymous messages have been sent!

1. Voltaire supported banning users, however displaying the user ID all the time led to users being hesitant to use the channel.
2. An update to the Discord API resulted in Voltaire being unable to "see" users. Users had to run a bot command (like !volt help) to gain access, however this could reveal their identity to anyone who saw the message and to the admins in the deleted logs.
3. The commands for both were long! We wanted the commands to be short and sweet.

## ⚙️ Features

- Supports sending messages to two channels (anon-msgs & deep-talks) which can be configured
- Ban users
- Anonymity for users
- Slow mode
- Display rules

## 🚀 Getting Started

Requires: <a href="https://nodejs.org/en/">Node.js</a>

1. <a href="https://discordpy.readthedocs.io/en/latest/discord.html">Create a Discord Bot Account</a>
2. `touch auth.json`

```
    {
        "token": {YOUR TOKEN HERE}
    }
```

3. `npm install`

4. `node bot.js` to run the bot!

5. Create three channels in your Discord server: one for logs, one for anon-messages, one for deep-talks.
   You will need administrator privileges in your discord server to set the channels.

6.

```
!anon set log #[log-channel]
!anon set anon #[anon-msgs]
!anon set deeptalks #[deep-talks]
```

## 📦 Contributing

1. Fork the repo
2. `git checkout -b {your branch name here}`
3. Write your code
4. Create a pull request from your fork into main
5. Run `npm run prettier` and `npm run lint`, fix all style checks
6. Squash & merge once approved!

## ✨ Authors

- <a href="https://github.com/SergeyGV">Sergey Gayvoronsky</a>
- <a href="https://github.com/jcserv">Jarrod Servilla</a>
- <a href="https://github.com/CometWhoosh">Yousef Bulbulia</a>
