import dotenv from "dotenv";
import { BotMaster } from "./botMaster";

dotenv.config();

const botToken = process.env.BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;

const botMaster = new BotMaster(botToken as string, openAiApiKey as string);

botMaster.start();
