import { BotMaster } from './botMaster';
import { GptAssistant } from './gptAssistant';
import Memory from './memory';
import { stockRetriever } from './stockRetriever';
const TelegramBot = require("node-telegram-bot-api");

// Mock the external dependencies
jest.mock('./gptAssistant');
jest.mock('./memory');
jest.mock('./stockRetriever');
jest.mock('node-telegram-bot-api');

describe('BotMaster', () => {
    let botMaster: BotMaster;
  
    beforeEach(() => {
      botMaster = new BotMaster('test_bot_token', 'test_openai_api_key', ['test_member']);
    });
  
    afterEach(() => {
      (GptAssistant.prototype.fetchGptResponseTurbo as jest.Mock).mockReset();
    });
  
    it('should handle stock events', async () => {
      const stockResponse = 'Sample stock response';
      const stockSymbol = 'amzn';
      (stockRetriever as jest.Mock).mockResolvedValue(stockResponse);
  
      const response = await BotMaster.handleStockEvent(`/stock ${stockSymbol}`);
  
      expect(response).toBe(stockResponse);
      expect(stockRetriever).toHaveBeenCalledWith(stockSymbol);
    });
  
    it('should handle GPT event', async () => {
      const gptResponse = 'Sample GPT response';
      const userInput = 'tell me a joke';
      (GptAssistant.prototype.fetchGptResponseTurbo as jest.Mock).mockResolvedValue(gptResponse);
  
      const response = await BotMaster.handleGPTEvent(userInput, 1, botMaster.gpt, botMaster.db);
  
      expect(response).toBe(gptResponse);
      expect(GptAssistant.prototype.fetchGptResponseTurbo).toHaveBeenCalledWith(userInput, [], {});
    });
  });
  
