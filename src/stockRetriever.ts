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

    const lastPrice = stockData["Global Quote"]["05. price"];
    const changePercent = stockData["Global Quote"]["10. change percent"];
    const lastTradeTime = stockData["Global Quote"]["07. latest trading day"];
    const symbol = stockData["Global Quote"]["01. symbol"];

    if (!symbol) {
      return `Can't find the stock symbol ${stockSymbol}`;
    }

    return `${symbol} $${lastPrice} \n${changePercent} change. \n${lastTradeTime} `;
  } catch (error) {
    console.error("Error fetching stock data: ", error);
    return "An error occurred. Please try again later.";
  }
}
