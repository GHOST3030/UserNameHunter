// configEditor.js
import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const CONFIG_PATH = './src/config.json';

function prompt(question) {
  return new Promise(resolve => rl.question(chalk.cyan(question), answer => resolve(answer)));
}

async function editConfig() {
  console.clear();
  console.log(chalk.yellowBright("=== GhostUsernameHunterPY - Config Editor ===\n"));

  let config = {};
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } else {
    console.log(chalk.red("No config.json file found. Creating a new one.\n"));
  }

  config.url = await prompt(`Server URL [${config.url || ''}]: `) || config.url;
  config.logout_url = await prompt(`Logout URL [${config.logout_url || ''}]: `) || config.logout_url;
  config.method = (await prompt(`Method (GET or POST) [${config.method || 'POST'}]: `)).toUpperCase() || config.method || 'POST';
  config.length = parseInt(await prompt(`Total Username Length [${config.length || 8}]: `)) || config.length || 8;
  config.digits = await prompt(`Digits for Random Part [${config.digits || '0123456789'}]: `) || config.digits || '0123456789';
  config.prefix = await prompt(`Username Prefix [${config.prefix || ''}]: `) || config.prefix || '';
  config.suffix = await prompt(`Username Suffix [${config.suffix || ''}]: `) || config.suffix || '';
  config.count = parseInt(await prompt(`Usernames to Generate [${config.count || 50}]: `)) || config.count || 50;

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

  console.log(chalk.greenBright("\nConfiguration updated successfully!\n"));
  rl.close();
}

editConfig();
