import chalk from 'chalk';
import fs from 'fs';
import { randomPartLength, config } from './variables.js';

const RULE_WIDTH = 60;
const RULE = chalk.cyan('─'.repeat(RULE_WIDTH));

function field(icon, label, value, colorFn = chalk.whiteBright) {
    const paddedLabel = chalk.bold.white(label.padEnd(14));
    return `  ${icon} ${paddedLabel} ${colorFn(String(value))}`;
}

function recordValid(username) {
    const timestamp = new Date().toLocaleString();
    fs.appendFileSync('./valid_usernames.txt', username + ' - Time: ' + timestamp + '\n');
}

export function LogValid(username) {
    console.log(chalk.bgGreen.black.bold(` كرت صحيح `) + ' ' + chalk.green.bold(username));
    recordValid(username);
}

export function LogInvalid(username) {
    console.log(chalk.gray(`  ✗ ${username}`));
}

// Backwards-compatible aliases (original exported names)
export const LogVaild = LogValid;
export const LogInvaild = LogInvalid;

export function LogInfo(text) {
    console.log(chalk.cyan(`  ℹ ${text}`));
}

export function LogWarn(text) {
    console.log(chalk.yellow(`  ⚠ ${text}`));
}

/**
 * One consolidated line per attempt instead of separate
 * "testing" / "result" / "timing" prints.
 */
export function LogAttempt(index, username, isValid, ms) {
    const num = chalk.gray(`#${String(index).padStart(5)}`);
    const name = chalk.whiteBright(username.padEnd(16));
    const status = isValid
        ? chalk.bgGreen.black.bold(' صحيح ')
        : chalk.gray('   ·   ');
    const time = ms > 2000 ? chalk.red(`${ms} م.ث`) : chalk.dim(`${ms} م.ث`);

    console.log(`  ${num}  ${name} ${status}  ${time}`);

    if (isValid) {
        recordValid(username);
    }
}

export function LogBanner(toolName) {
    console.log('');
    console.log(RULE);
    console.log(chalk.bold.cyanBright(`  ${toolName}`));
    console.log(chalk.gray('  تطوير: Ghost — تيليجرام @GHOST_529'));
    console.log(RULE);
    console.log('');
    console.log(field('🎯', 'الهدف', config.url, chalk.cyan));
    console.log(field('⚙️ ', 'الطريقة', config.method, chalk.magenta));
    console.log(field('🔤', 'الصيغة', `${config.prefix}[عشوائي]${config.suffix}`, chalk.green));
    console.log(field('📏', 'الطول العشوائي', randomPartLength, chalk.yellow));
    console.log(field('🔢', 'عدد المحاولات', config.count, chalk.yellow));
    console.log(field('🕒', 'وقت البدء', new Date().toLocaleString(), chalk.gray));
    console.log('');
    console.log(RULE);
    console.log('');
    console.log(chalk.gray(`  ${'#'.padStart(6)}  ${'الكرت'.padEnd(16)} النتيجة     الوقت`));
    console.log(chalk.gray(`  ${'─'.repeat(RULE_WIDTH - 2)}`));
}
