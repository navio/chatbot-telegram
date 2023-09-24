import axios from "axios";

export async function stockRetriever(stockSymbol: string) {
  const API_KEY = process.env.FINNHUB_API_KEY;
  try {
    const isNaN = Number.isNaN(Number(stockSymbol));
    if (!isNaN) return "";
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${stockSymbol}&token=${API_KEY}`
    );
    const stockData = response.data;
    if (!stockData["c"]) {
      return "Invalid stock symbol. Please try again.";
    }

    const currentPrice = stockData["c"];
    const previousClose = stockData["pc"];
    const highPrice = stockData["h"];
    const lowPrice = stockData["l"];
    const percentage = stockData["dp"];

    return `${stockSymbol}\n Current price: $${currentPrice} \n Previous close: $${previousClose} \n High: $${highPrice} \n Low: $${lowPrice} \n Delta: ${percentage}%`;
  } catch (error) {
    console.error("Error fetching stock data: ", error);
    return "An error occurred. Please try again later.";
  }
}
