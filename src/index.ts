import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import Memory from "./memory";
import dotenv from "dotenv";
import axios from "axios";
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

bot.onText(/\$stock/, async (msg: Message) => {
  const stockSymbol = msg.text.slice(6).trim();
  const chatId = msg.chat.id;
  console.log("stockSymbol", stockSymbol);
  const response = await stockRetriever(stockSymbol);
  bot.sendMessage(chatId, response);
});

bot.onText(/\$gpt4/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const messageText = msg.text.slice(5).trim(); // Remove the "$gpt" keyword
  console.log("GPT4");
  bot.sendChatAction(chatId, "typing");
  if (!messageText) {
    bot.sendMessage(chatId, "Please type a message after the *gpt keyword.");
    return;
  }
  const interval = setInterval(() => {
    bot.sendChatAction(chatId, "typing");
  }, 2000);
  const htmlOutput = await gptRetriever(messageText, chatId, true, {
    model: "gpt-4",
  });
  clearInterval(interval);
  bot.sendMessage(chatId, htmlOutput, {
    parse_mode: "HTML",
  });
  return;
});

bot.onText(/\$gpt\s/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const messageText = msg.text.slice(4).trim(); // Remove the "$gpt" keyword
  bot.sendChatAction(chatId, "typing");
  if (!messageText) {
    bot.sendMessage(chatId, "Please type a message after the *gpt keyword.");
    return;
  }
  const interval = setInterval(() => {
    bot.sendChatAction(chatId, "typing");
  }, 2000);
  const htmlOutput = await gptRetriever(messageText, chatId);
  clearInterval(interval);
  bot.sendMessage(chatId, htmlOutput, {
    parse_mode: "HTML",
  });
});

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
    if (messageText.startsWith("/turbo")) {
      return "turbo";
    }
    if (
      messageText.startsWith("$stock") ||
      messageText.startsWith("$gpt4") ||
      messageText.startsWith("$gpt")
    ) {
      return "skip";
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
      case "turbo": {
        console.log("turbo");
        const fixedTurbo = msg.text.slice(6).trim();
        const interval = setInterval(() => {
          bot.sendChatAction(chatId, "typing");
        }, 2000);
        const response = gptRetriever(fixedTurbo, chatId);
        clearInterval(interval);
        bot.sendMessage(chatId, response, {
          parse_mode: "HTML",
        });

        break;
      }
      case "skip":
        break;
      default: {
        const previous = db.getMessages(chatId);
        const interval = setInterval(() => {
          bot.sendChatAction(chatId, "typing");
        }, 2000);
        const responseText = await fetchGptResponseTurbo(
          messageText,
          previous as string[],
          {
            model: "gpt-4",
          }
        );
        clearInterval(interval);
        // db.addMessage(chatId, messageText);
        db.addMessage(chatId, responseText);
        const htmlOutput = formatHTMLResponse(responseText);
        bot.sendMessage(chatId, htmlOutput, {
          parse_mode: "HTML",
        });
        break;
      }
    }
  }
});

async function fetchGptResponseTurbo(
  message: string,
  previous: string[],
  params = {}
) {
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

  const defaultParams = {
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    presence_penalty: 1,
    frequency_penalty: 0.5,
  };

  try {
    const response = (await openai.createChatCompletion({
      ...defaultParams,
      ...params,
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

async function stockRetriever(stockSymbol: string) {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    const stockData = response.data;
    if (stockData["Error Message"] || !stockData["Global Quote"]) {
      return "Invalid stock symbol. Please try again.";
    }

    const lastPrice = stockData["Global Quote"]["05. price"];
    const changePercent = stockData["Global Quote"]["10. change percent"];
    const lastTradeTime = stockData["Global Quote"]["07. latest trading day"];
    const symbol = stockData["Global Quote"]["01. symbol"];

    if (!symbol) {
      return `Can't find the stock`;
    }

    return `${symbol}: \nPrice $${lastPrice}, \n${changePercent} change. \n${lastTradeTime} `;
  } catch (error) {
    console.error("Error fetching stock data: ", error);
    return "An error occurred. Please try again later.";
  }
}

async function gptRetriever(
  messageText: string,
  chatId: number,
  html: boolean = true,
  pattern: {} = {}
) {
  try {
    const previous = db.getMessages(chatId);
    const responseText = await fetchGptResponseTurbo(messageText, previous, {
      model: "gpt-3.5-turbo",
      ...pattern,
    });
    db.addMessage(chatId, messageText);
    db.addMessage(chatId, responseText);
    const htmlOutput = formatHTMLResponse(responseText);
    return html ? htmlOutput : responseText;
  } catch (error) {
    console.error("GPT Error:", error);
    return "An error occurred while fetching the GPT response. Please try again.";
  }
}
