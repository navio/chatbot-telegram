import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import Memory from "./memory";
import dotenv from "dotenv";
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();

const db = new Memory();

marked.setOptions({
  breaks: true,
  gfm: true,
});

const botToken = process.env.BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;

const configuration = new Configuration({
  apiKey: openAiApiKey,
});

const openai = new OpenAIApi(configuration);

const bot = new TelegramBot(botToken as string, { polling: true });

type Message = {
  from: { id: string; username: string };
  chat: { id: number };
  text: string;
};

bot.on("message", async (msg: Message) => {
  console.log("userID", msg.from.id);
  console.log("chatID", msg.chat.id);

  const messageText = msg?.text?.trim() || "";
  if (!messageText) return;

  const chatId = msg.chat.id;
  const userId = msg.from.username;

  const checkForKeys = (messageText: string) => {
    if (messageText.startsWith("/start")) {
      return "start";
    }
    if (messageText.startsWith("/simple")) {
      return "simple";
    }
    return;
  };

  const keys = checkForKeys(messageText);

  bot.sendChatAction(chatId, "typing");

  if (userId === "alnavarro" && chatId === 473091077) {
    switch (keys) {
      case "start":
        bot.sendMessage(chatId, "Welcome to the bot!");
        break;
      case "simple":
        console.log("simple");
        const fixed = msg.text.slice(7).trim();
        const responseTextTurbo = await fetchGptResponse(fixed);
        bot.sendMessage(chatId, responseTextTurbo);
        break;
      default:
        db.addMessage(chatId, messageText);
        const previous = db.getMessages(chatId);
        const responseText = await fetchGptResponseTurbo(
          messageText,
          previous as string[]
        );
        db.addMessage(chatId, responseText);
        const htmlOutput = formatHTMLResponse(responseText);
        bot.sendMessage(chatId, htmlOutput, {
          parse_mode: "HTML",
        });
        break;
    }
  }
});

bot.onText(/\*gpt/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const messageText = msg.text.slice(5).trim(); // Remove the "$gpt" keyword
  bot.sendChatAction(chatId, "typing");
  if (!messageText) {
    bot.sendMessage(chatId, "Please type a message after the *gpt keyword.");
    return;
  }

  try {
    const previous = db.getMessages(chatId);
    const responseText = await fetchGptResponseTurbo(messageText, previous);
    const htmlOutput = formatHTMLResponse(responseText);
    db.addMessage(chatId, responseText);
    bot.sendMessage(chatId, htmlOutput, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("GPT Error:", error);
    bot.sendMessage(
      chatId,
      "An error occurred while fetching the GPT response. Please try again."
    );
  }
});

async function fetchGptResponseTurbo(message: string, previous: string[]) {
  const assistantMessages = previous.map((message) => ({
    role: "assistant",
    content: message,
  }));
  console.log("trail", assistantMessages.length);
  const messages = [
    {
      role: "system",
      content:
        "You are an assistant knowledgeable in Software Development and all General Knowledge that provides helpful and informative responses.",
    },
    {
      role: "user",
      content: message,
    },
    ...assistantMessages,
  ] as ChatCompletionRequestMessage[];
  try {
    const response = (await openai.createChatCompletion({
      temperature: 0.2,
      presence_penalty: 1,
      frequency_penalty: 0.5,
      model: "gpt-3.5-turbo",
      messages: messages,
    })) as { data: { choices: { message: { content: string } }[] } };
    const messageText = response.data.choices[0].message.content;
    console.log(messageText);
    return messageText;
  } catch (error) {
    console.error("Error fetching GPT response:", error);
    return "An error occurred while fetching the GPT response. Please try again.";
  }
}

async function fetchGptResponse(message: string) {
  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: message,
      max_tokens: 3200,
    });
    const completion_text = completion.data.choices[0].text;
    console.log(JSON.stringify(completion_text));
    return completion_text;
  } catch (error) {
    console.error("Error fetching GPT response:", error);
    return "An error occurred while fetching the GPT response. Please try again.";
  }
}

function formatHTMLResponse(response: string) {
  const htmlOutput = marked(response);

  return sanitizeHtml(htmlOutput, {
    allowedTags: [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "ins",
      "s",
      "strike",
      "del",
      "a",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href"],
    },
  });
}
