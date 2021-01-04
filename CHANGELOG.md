# Changelog

## V1.2 - Jan 4th, 2020

User-facing:

1. Reply feature - now you can reply to messages by running the command !send reply [msgId] [msg]. It will
   display similar to Discord's old quote messaging with a jump link button! Thank you to Yousef for completing this
   feature! :)
2. Easier setup - when adding the bot to your server, you can run !anon set #anon-msgs #deep-talks #anon-logs all in one go.
   Idea proposed by Yousef & implemented by Jarrod.
3. Reorganized !help command for enhanced clarity

Dev-side:

1. Introduced ci linting to the repo! Make sure you run `npm run prettier` and `npm run lint` to maintain style consistency.
2. Created issue & pull request templates
3. Added this CHANGELOG.md

## V1.1 - Dec 26, 2020

1. Added a keep-alive script to improve bot uptime in the event of a crash
2. !rules command - any messages that do not follow these rules will be deleted
3. Privacy Improvement - We noticed that it was possible for admins to read the message history of an
   anon based on their anon ID. This was similar to voltaire where you could CTRL+F by user id.
   Therefore we added a layer of privacy by removing anon ID from the logs + bans are done using msg # rather than anon ID.
