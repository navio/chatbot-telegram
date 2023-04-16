const TelegramBot = require("node-telegram-bot-api");
const { Configuration, OpenAIApi } = require("openai");
const Desing = require("marked");
const sanitzed = require("sanitize-html");

require("dotenv").config();

Desing.marked.setOptions({
  breaks: true,
  gfm: true,
});

const botToken = process.env.BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;

const configuration = new Configuration({
  apiKey: openAiApiKey,
});

const openai = new OpenAIApi(configuration);

const bot = new TelegramBot(botToken, { polling: true });

bot.on("message", async (msg) => {
  console.log("userID", msg.from.id);
  console.log("chatID", msg.chat.id);

  const messageText = msg.text.trim();

  const chatId = msg.chat.id;
  const userId = msg.from.username;

  const checkForKeys = (messageText) => {
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
        bot.sendMessage(chatId, responseTextTurbo, {
          parse_mode: "HTML",
        });
        break;
      default:
        const responseText = await fetchGptResponseTurbo(
          messageText,
          msg.from.id
        );
        bot.sendMessage(chatId, responseText);
        break;
    }
  }
});

bot.onText(/^\*gpt/, async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text.slice(5).trim(); // Remove the "$gpt" keyword
  bot.sendChatAction(chatId, "typing");
  if (!messageText) {
    bot.sendMessage(chatId, "Please type a message after the $gpt keyword.");
    return;
  }

  try {
    const responseText = await fetchGptResponseTurbo(messageText, msg.from.id);
    bot.sendMessage(chatId, responseText, {
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

async function fetchGptResponseTurbo(message, user = "bot1") {
  const messages = [
    {
      role: "system",
      content:
        "You are an assistant knowledable in Software Development and all General Knowladge that provides helpful and informative responses.",
    },
    {
      role: "user",
      content: message,
    },
  ];
  try {
    const response = await openai.createChatCompletion({
      temperature: 0.2,
	  presence_penalty: 1,
	  frequency_penalty: 0.5,
      model: "gpt-3.5-turbo",
      messages: messages,
    });
    const messageText = response.data.choices[0].message.content;
    console.log(messageText);
    const htmlOutput = formatHTMLResponse(messageText);
    return htmlOutput;
  } catch (error) {
    console.error("Error fetching GPT response:", error);
    return "An error occurred while fetching the GPT response. Please try again.";
  }
}

async function fetchGptResponse(message) {
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

formatHTMLResponse = (response) => {
  const htmlOutput = Desing.marked(response);

  return sanitzed(htmlOutput, {
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
};
