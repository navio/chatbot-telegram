import { GptAssistant } from "./gptAssistant";
import Memory from "./memory";
import { stockRetriever } from "./stockRetriever";
const TelegramBot = require("node-telegram-bot-api");

export class BotMaster {
  private botToken: string;
  private openAiApiKey: string;
  private bot: typeof TelegramBot;
  public gpt: GptAssistant;
  public db: Memory;

  constructor(botToken: string, openAiApiKey: string) {
    // Initialize bot token and OpenAI API key
    this.botToken = botToken;
    this.openAiApiKey = openAiApiKey;

    // Set up the bot, Memory and GptAssistant instances
    this.bot = new TelegramBot(this.botToken, { polling: true });
    this.db = new Memory();
    this.gpt = new GptAssistant(this.openAiApiKey);
  }

  static async handleStockEvent(msg: any) {
    const stockSymbol = msg.slice(6).trim();
    const response = await stockRetriever(stockSymbol);
    return response;
  }

  static async handleGPTEvent(
    msg: string,
    chatID: number,
    gpt: GptAssistant,
    db: Memory,
    params: { [key: string]: string | number } = {}
  ) {
    if (!msg) {
      return "Please type a message after the *gpt keyword.";
    }
    const messages = db.getMessages(chatID);
    const output = await gpt.fetchGptResponseTurbo(msg, messages, params);
    db.addMessage(chatID, "user", msg);
    db.addMessage(chatID, "assistant", output);

    const formattedOutput = gpt.formatHTMLResponse(output);
    return formattedOutput;
  }

  async handleGPTEventInternal(
    msg: string,
    chatID: number,
    params: { [key: string]: string | number } = {}
  ) {
    return BotMaster.handleGPTEvent(msg, chatID, this.gpt, this.db, params);
  }

  startTypingInterval(chatId: number) {
    const interval = setInterval(() => {
      this.bot.sendChatAction(chatId, "typing");
    }, 2000);
    return interval;
  }

  start() {
    // Default message event listener
    this.bot.on("message", async (msg: any) => {
      console.log("userID", msg.from.id);
      console.log("chatID", msg.chat.id);

      const messageText = msg?.text?.trim() || "";
      if (!messageText) return;

      const chatId = msg.chat.id;
      const userId = msg.from.username;

      let response = "";
      // Stock event listener
      if (messageText.startsWith("/stock")) {
        response = await BotMaster.handleStockEvent(messageText);
      }
      // GPT4 event listener
      else if (messageText.startsWith("*gpt4")) {
        const interval = this.startTypingInterval(chatId);
        response = await this.handleGPTEventInternal(
          messageText.slice(5).trim(),
          chatId,
          {
            model: "gpt-4",
          }
        );
        clearInterval(interval);
      }
      // GPT event listener
      else if (messageText.startsWith("*gpt")) {
        response = await this.handleGPTEventInternal(
          messageText.slice(4).trim(),
          chatId
        );
      }
      // Process other messages
      else {
        // Process stock symbols starting with $
        const stockRegex = /\$[^\s]+/g;
        const stocks = messageText.match(stockRegex);

        if (stocks && stocks.length) {
          for (const stock of stocks) {
            const stockSymbol = stock.slice(1); // Remove the '$' symbol
            response = await stockRetriever(stockSymbol);
            this.bot.sendMessage(chatId, response);
          }
          return;
        }

        // Personal Code

        this.bot.sendChatAction(chatId, "typing");
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
          if (messageText.startsWith("/clear")) {
            return "clear";
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
        if (userId === "alnavarro" && chatId === 473091077) {
          switch (keys) {
            case "start":
              this.bot.sendMessage(chatId, "Welcome to the bot!");
              break;
            case "simple":
              console.log("simple");
              const fixed = msg.text.slice(7).trim();
              const responseTextTurbo = await this.gpt.fetchGptResponseTurbo(
                fixed,
                []
              );
              this.bot.sendMessage(chatId, responseTextTurbo);
              break;
            case "turbo":
              console.log("turbo");
              const fixedTurbo = msg.text.slice(6).trim();
              const interval = setInterval(() => {
                this.bot.sendChatAction(chatId, "typing");
              }, 2000);
              const response = this.gpt.fetchGptResponseTurbo(fixedTurbo, []);
              clearInterval(interval);
              this.bot.sendMessage(chatId, response, {
                parse_mode: "HTML",
              });
              break;
            case "clear":
              this.db.clearMessages(chatId);
              this.bot.sendMessage(chatId, "Messages cleared");
              break;
            case "skip":
              break;
            default: {
              // start typing action
              const interval = this.startTypingInterval(chatId);
              // get response
              const response = await this.handleGPTEventInternal(
                messageText,
                chatId,
                {
                  model: "gpt-4",
                }
              );
              clearInterval(interval);
              // send response
              this.bot.sendMessage(chatId, response, {
                parse_mode: "HTML",
              });
            }
          }
        }
      }

      if (response) {
        this.bot.sendChatAction(chatId, "typing");
        this.bot.sendMessage(chatId, response, {
          parse_mode: "HTML",
        });
      }
    });
  }
}
