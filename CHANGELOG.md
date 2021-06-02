# Changelog

## V1.6 - June 2nd, 2021

1. Introduced a warnings feature that allows admins and mods to warn users for sending inappropriate messages.

## V1.5 - Apr 29th, 2021

1. Made the bot DM the user when they have been banned / unbanned
2. Added the status "Playing !help"
3. Made deleted messages incapable of being replied to
4. Improved !help command for better readability
5. Made the reply command accept the pound sign before the message number


## V1.4 - Apr 21st, 2021

1. Added a banlist command that displays all currently banned users
2. Enabled unban command to also take in anon id

## V1.3 - Jan 25th, 2021

1. Fixed the reply formatting for messages that are longer than 130 characters and have more than three newlines. Now, the quote block in
   a reply to these types of messages cuts off after either 130 characters or three newlines, whichever comes first.
2. Removed the timestamp from messages.
3. Redesigned the !help command for better readability.
4. Added a hate speech filter

## V1.2 - Jan 9th, 2021

User-facing:

1. Reply feature - now you can reply to messages by running the command !send reply [msgId] [msg]. It will
   display similar to Discord's old quote messaging with a jump link button! Thank you to Yousef for completing this
   feature! :)
2. Easier setup - when adding the bot to your server, you can run !anon set #anon-msgs #deep-talks #anon-logs all in one go.
   Idea proposed by Yousef & implemented by Jarrod.
3. Reorganized !help command for enhanced clarity
4. Fixed the reply formatting for spoiler tags, code tags, and multiline code blocks when messages that are longer than 130 characters
   are replied to.

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
