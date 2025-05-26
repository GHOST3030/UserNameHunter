import fs from 'fs';
import readline  from 'readline';
const path = './src/config.json';

const defaultConfig = {
  url: "http://example.com/login",
  logout_url: "http://example.com/logout",
  method: "POST",
  length: 8,
  digits: "0123456789",
  prefix: "",
  suffix: "",
  count: 10
};

function loadConfig() {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  const data = fs.readFileSync(path);
  return JSON.parse(data);
}

function saveConfig(config) {
  fs.writeFileSync(path, JSON.stringify(config, null, 2));
  console.log('\nConfig updated successfully.');
}

async function editConfig() {
  const config = loadConfig();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  for (const key in config) {
    const current = config[key];
    const answer = await new Promise((resolve) => {
      rl.question(`${key} [${current}]: `, resolve);
    });

    if (answer.trim() !== '') {
      if (["length", "count"].includes(key)) {
        config[key] = parseInt(answer);
      } else {
        config[key] = answer;
      }
    }
  }

  rl.close();
  saveConfig(config);
}

editConfig();
