import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import axios from 'axios';

const ROOT_DIR = path.join(__dirname, '..', '..', '..', '..');
const PROMPT_FILE = path.join(ROOT_DIR, 'prompt.csv');
const OUTPUT_FILE = path.join(ROOT_DIR, 'prompt_translated.csv');

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

const translatePrompt = async (prompt: string): Promise<string> => {
  const response = await axios.post(
    'https://api.openai.com/v1/engines/davinci-codex/completions',
    {
      prompt,
      max_tokens: 60,
      n: 1,
      stop: ['\n'],
      temperature: 0.7,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
    }
  );

  const { choices } = response.data?.choices?.[0] ?? {};

  if (!choices || choices.length === 0) {
    throw new Error('Failed to translate prompt');
  }

  return choices[0].text.trim();
};

const translatePrompts = async () => {
  const prompts = [];

  fs.createReadStream(PROMPT_FILE)
    .pipe(csv())
    .on('data', async (data) => {
      const prompt = data.prompt.trim();

      if (prompt) {
        const translatedPrompt = await translatePrompt(prompt);
        prompts.push({ prompt: translatedPrompt });
      }
    })
    .on('end', () => {
      fs.writeFileSync(OUTPUT_FILE, '');
      prompts.forEach((prompt) => {
        fs.appendFileSync(OUTPUT_FILE, `${prompt.prompt}\n`);
      });
    });
};

translatePrompts();
