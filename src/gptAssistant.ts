import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
  breaks: true,
  gfm: true,
});

export class GptAssistant {
  private apiKey: string;
  private openai: OpenAIApi;

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    const configuration = new Configuration({
      apiKey: this.apiKey,
    });

    this.openai = new OpenAIApi(configuration);
  }

  async fetchGptResponseTurbo(
    message: string,
    previous: { sender: string; content: string }[],
    params = {}
  ) {
    const assistantMessages = previous.map(({sender, content}) => ({
      role: sender,
      content,
    }));

    const messages = [
      {
        role: "system",
        content:
          "You are an assistant knowledgeable in Software Development and all General Knowledge that provides helpful and informative responses.",
      },
      ...assistantMessages,
      {
        role: "user",
        content: message,
      },
    ] as ChatCompletionRequestMessage[];

    const defaultParams = {
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      presence_penalty: 1,
      frequency_penalty: 0.5,
    };

    try {
      const response = (await this.openai.createChatCompletion({
        ...defaultParams,
        ...params,
        messages: messages,
      })) as { data: { choices: { message: { content: string } }[] } };
      const messageText = response.data.choices[0].message.content;
      return messageText;
    } catch (error) {
      console.error("Error fetching GPT response:", error);
      return "An error occurred while fetching the GPT response. Please try again.";
    }
  }

  formatHTMLResponse(response: string) {
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
}
