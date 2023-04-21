import dotenv from "dotenv";
import { BotMaster } from "./botMaster";

dotenv.config();

const botToken = process.env.BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;
const allowed_members = process.env.ALLOWED_MEMBERS?.split(",");

const botMaster = new BotMaster(
  botToken as string,
  openAiApiKey as string,
  allowed_members as string[]
);

botMaster.start();
