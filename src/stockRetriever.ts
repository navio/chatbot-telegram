import axios from "axios";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
export async function stockRetriever(stockSymbol: string) {
  try {
    const isNaN = Number.isNaN(Number(stockSymbol));
    if (!isNaN) return '';
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=${API_KEY}`
    );
    const stockData = response.data;
    if (stockData["Error Message"] || !stockData["Global Quote"]) {
      return "Invalid stock symbol. Please try again.";
    }

    const symbol = stockData["Global Quote"]["01. symbol"];

    if (!symbol) {
      return `Can't find the stock symbol ${stockSymbol}`;
    }

    const allStockData = Object.keys(stockData["Global Quote"]).reduce((acc, key) => {
      if(key === '01. symbol') return acc + `${stockData["Global Quote"][key]}:\n`;
      const newLine = `${key}: ${stockData["Global Quote"][key]}\n`
      return acc + newLine;
    }, '')

    return allStockData;
  } catch (error) {
    console.error("Error fetching stock data: ", error);
    return "An error occurred. Please try again later.";
  }
}
