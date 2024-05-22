import { OpenAIApi, Configuration } from "openai";

const configuration = new Configuration({
});
const openai = new OpenAIApi(configuration);

async function main() {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Create a short and simple sentence using the word sad that is easy to understand for children below 10 years old." }],
      max_tokens: 20,
    });

    console.log(response.data.choices[0].message.content.trim());
  } catch (error) {
    console.error("Error fetching sentence:", error.response ? error.response.data : error.message);
  }
}

main();
