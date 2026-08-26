import chalk from 'chalk';
import fs from 'fs';
import { randomPartLength, config } from './variables.js';

const BOX_WIDTH = 60;

function center(text) {
    const padding = Math.max(0, BOX_WIDTH - text.length);
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
}

function infoLine(label, value) {
    const paddedLabel = label.padEnd(18, '.');
    const raw = `  ${paddedLabel} ${value}`;
    const display = raw.padEnd(BOX_WIDTH - 1);
    return chalk.white(display.slice(0, raw.length)) + display.slice(raw.length);
}

export function LogValid(username) {
    console.log(chalk.green(`[+] Valid username: ${username}`));
    const timestamp = new Date().toLocaleString();
    fs.appendFileSync('./valid_usernames.txt', username + ' - Time: ' + timestamp + '\n');
}

export function LogInvalid(username) {
    console.log(chalk.red(`[-] Invalid: ${username}`));
}

// Backwards-compatible aliases (original exported names)
export const LogVaild = LogValid;
export const LogInvaild = LogInvalid;

export function LogBanner(toolName) {
    const border = chalk.cyan('╔' + '═'.repeat(BOX_WIDTH) + '╗');
    const footer = chalk.cyan('╚' + '═'.repeat(BOX_WIDTH) + '╝');
    const divider = chalk.cyan('║' + '─'.repeat(BOX_WIDTH) + '║');
    const line = (text) => chalk.cyan('║') + chalk.green(center(text)) + chalk.cyan('║');
    const infoRow = (text) => chalk.cyan('║') + text + chalk.cyan('║');

    console.log(border);
    console.log(line(toolName));
    console.log(line('Developed By Ghost - Telegram @GHOST_529'));
    console.log(divider);
    console.log(infoRow(infoLine('Target', config.url)));
    console.log(infoRow(infoLine('Method', config.method)));
    console.log(infoRow(infoLine('Username Format', `${config.prefix}[random]${config.suffix}`)));
    console.log(infoRow(infoLine('Random Length', randomPartLength)));
    console.log(infoRow(infoLine('Usernames to Test', config.count)));
    console.log(infoRow(infoLine('Started At', new Date().toLocaleString())));
    console.log(footer);
}
