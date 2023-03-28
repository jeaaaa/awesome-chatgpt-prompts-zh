import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import csv from "csv-parser";
import axios from "axios";

dotenv.config();

const ROOT_DIR = path.join(__dirname, "../../");
const PROMPT_FILE = path.join(ROOT_DIR, "prompts.csv");
const OUTPUT_JSON_FILE = path.join(ROOT_DIR, "prompt_translated.json");
const OUTPUT_MD_FILE = path.join(ROOT_DIR, "prompt_translated.md");

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiApiUrl = process.env.OPENAI_API_BASE_URL;

if (!openaiApiKey) {
  console.error("OPENAI_API_KEY environment variable not set");
  process.exit(1);
}

const translatePrompt = async (prompt: string): Promise<string> => {
  const response = await axios.post(
    `${openaiApiUrl}/v1/completions`,
    {
      prompt,
      max_tokens: 1024,
      model: "text-davinci-003",
      // n: 1,
      // stop: ["\n"],
      top_p: 1,
      temperature: 0.3,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
    }
  );
  console.log(response.data);
  console.log(response.data?.choices[0].text);
  const { choices } = response.data ?? {};

  if (!choices || choices.length === 0) {
    throw new Error("Failed to translate prompt");
  }

  return choices[0].text.trim();
};

const translatePrompts = async () => {
  const prompts = [];

  const csvStream = fs.createReadStream(PROMPT_FILE).pipe(csv());

  for await (const data of csvStream) {
    const prompt = data.prompt.trim();
    const act = data.act.trim();

    if (prompt && act) {
      const promptText = `Please help me to translate, " ${prompt} " to simplified chinese`;
      const actText = `Please help me to translate, "${act}" to simplified chinese`;
      console.log(actText);
      try {
        const translatedPrompt = await translatePrompt(promptText);
        const translatedAct = await translatePrompt(actText);
        prompts.push({ act: translatedAct, prompt: translatedPrompt });
      } catch (err) {
        console.error(`Unable to translate prompt: ${prompt}`, err);
      }
    }
  }

  if (prompts.length > 0) {
    fs.writeFileSync(OUTPUT_JSON_FILE, "");
    fs.appendFileSync(OUTPUT_JSON_FILE, JSON.stringify(prompts));

    fs.writeFileSync(OUTPUT_MD_FILE, "# Prompts\n\n");
    prompts.forEach((prompt) => {
      const mdContent = `## ${prompt.act}\n ${prompt.prompt}\n`;
      fs.appendFileSync(OUTPUT_MD_FILE, mdContent);
    });
  }
};

translatePrompts();
