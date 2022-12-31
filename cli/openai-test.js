#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import got from 'got';
// const got = require('got');
const prompt = `Artist: Megadeth\n\nLyrics:\n`;

const l = console.log;

(async () => {
  const url = 'https://api.openai.com/v1/engines/davinci/completions';
  const params = {
    "prompt": prompt,
    "max_tokens": 160,
    "temperature": 0.7,
    "frequency_penalty": 0.5
  };
  const headers = {
      'Authorization': `Bearer ${process.env.OPENAI_SECRET_KEY}`,
      'Content-Type':'application/json',
  };

  try {
    const response = await got.post(url, { json: params, headers: headers }).json();
      const output = `${prompt}${response.choices[0].text}`;
    console.log(output);
  } catch (err) {
      console.log(err);
      l('CODE:',err.code)
      
  }
})();
