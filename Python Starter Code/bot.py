# bot.py
import os
import discord
import random
import re
import json


from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
QUOTES_PATH="quotes.txt"
client = discord.Client()

@client.event
async def on_ready():
    game=False
    ans=""
    # Everything under here, the bot executes for "commands"
    print(f'{client.user} has connected to Discord!')


@client.event
async def on_message(message):
    # client.user = this bot
    # message.author = who sent the message
    # message.content = contents of the message

client.run(TOKEN)
