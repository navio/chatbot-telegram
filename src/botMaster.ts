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
  private members: string[];

  constructor(botToken: string, openAiApiKey: string, allowed_members: string[]) {
    // Initialize bot token and OpenAI API key
    this.botToken = botToken;
    this.openAiApiKey = openAiApiKey;
    this.members = allowed_members;

    // Set up the bot, Memory and GptAssistant instances
    this.bot = new TelegramBot(this.botToken, { polling: true });
    this.db = new Memory();
    this.gpt = new GptAssistant(this.openAiApiKey);

    // binding to use everywhere.
    this.onMessage = this.onMessage.bind(this);
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

  async triggers(messageText: string, chatId: number) {

    let response

    if (messageText.startsWith("/stock")) { // Stock event listener
      response = await BotMaster.handleStockEvent(messageText);
    }
    else if (messageText.startsWith("*gpt4")) { // GPT4 event listener
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
    else if (messageText.startsWith("*gpt")) { // GPT event listener
      response = await this.handleGPTEventInternal(
        messageText.slice(4).trim(),
        chatId
      );
    }

    return response;
  }

  async onMessage(msg: any) {
    console.log("message from userID: ", msg.from.username);
    console.log("on chatID", msg.chat.id);
    console.log("from id", msg.from.id)

    const chatId = msg.chat.id;
    const username = msg.from.username;
    const fromId = msg.from.id;

    const chats = [-569513240]

    const isActiveGroupChat = chats.includes(Number(chatId));
    const isActivePrivateChat = this.members.includes(username) && chatId === fromId;

    const messageText = msg?.text?.trim() || "";
    if (!messageText) return;

    if (!isActiveGroupChat && !isActivePrivateChat) return;

    let response;

    // Process stock symbols starting with $
    const stockRegex = /\$[a-zA-Z]+\b/g;
    const stocks = messageText.match(stockRegex);

    if (stocks && stocks.length) {
      for (const stock of stocks) {
        const stockSymbol = stock.slice(1); // Remove the '$' symbol
        response = await stockRetriever(stockSymbol);
        response && this.bot.sendMessage(chatId, response);
      }
      return;
    }

    const createRegexMatchingWords = (words: string[]) => {
      // Escape special regex characters
      const escapedWords = words.map(
        word => word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      ).join("|");
      // Create regex pattern
      const pattern = `^(${escapedWords})`;
      // Return the compiled regex
      return new RegExp(pattern);
    }

    // this.bot.sendChatAction(chatId, "typing");
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

      const regex = createRegexMatchingWords(['/stock', '$stock', '*gpt4', '*gpt'])
      if (
        regex.test(messageText)
      ) {
        return "skip";
      }
      return;
    };

    const keys = checkForKeys(messageText);

    if (isActivePrivateChat) {
      console.log('here')
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
          // special cases.
          let data = await this.triggers(messageText, chatId);
          this.bot.sendMessage(chatId, data, {
            parse_mode: "HTML",
          });
          break;
        default: {
          // start typing action
          const interval = this.startTypingInterval(chatId);
          // get response
          const response = await this.handleGPTEventInternal(
            messageText,
            chatId,
            {
              // model: "gpt-4",
            }
          );
          clearInterval(interval);
          // send response
          this.bot.sendMessage(chatId, response, {
            parse_mode: "HTML",
          });
          return;
        }
      }
    }

    if (isActiveGroupChat && keys === "skip") {
      // special cases.
      let data = await this.triggers(messageText, chatId);
      this.bot.sendMessage(chatId, data, {
        parse_mode: "HTML",
      });
      return;
    }

  }

  start() {
    this.bot.on("message", async (arg: any) => {  await this.onMessage(arg) });
  }
}
