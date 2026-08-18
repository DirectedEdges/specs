/**
 * Init Command
 *
 * Scaffolds the config/ directory — conventions.yaml, settings.yaml, and
 * pipeline.yaml — with production-ready defaults and inline documentation
 * for getting started with Specs CLI.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { generateConfigTemplates } from '../Config/ConfigTemplates.js';

export const Init = new Command('init')
  .description('Initialize config/conventions.yaml, config/settings.yaml, and config/pipeline.yaml with production defaults')
  .option('--force', 'Overwrite existing config without prompting')
  .option('-c, --config <path>', 'Custom directory to write the config files into (default: current directory)')
  .action(async (options) => {
    await initCommand(options as { force?: boolean; config?: string });
  });

/**
 * Initialize config files
 */
async function initCommand(options: { force?: boolean; config?: string }): Promise<void> {
  const baseDir = options.config || '.';
  const templates = generateConfigTemplates();
  const existing = Object.keys(templates).filter(rel => fs.existsSync(path.join(baseDir, rel)));

  if (existing.length > 0 && !options.force) {
    // Prompt before overwriting
    const shouldOverwrite = await promptBeforeOverwrite(existing.join(', '));
    if (!shouldOverwrite) {
      console.log('Config initialization cancelled.');
      return;
    }
  }

  try {
    for (const [rel, template] of Object.entries(templates)) {
      const filePath = path.join(baseDir, rel);
      fs.ensureDirSync(path.dirname(filePath));
      fs.writeFileSync(filePath, template, 'utf-8');
      console.log(`✓ Created ${filePath}`);
    }
    console.log('📚 Next steps:');
    console.log('   1. Edit the config file to add your Figma file keys');
    console.log('   2. Run: specs fetch');
    console.log('   3. Run: specs scan');
    console.log('   4. Run: specs generate');
    console.log('');
    console.log('📖 Documentation: docs/cli/configuration.md');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error creating config file: ${error.message}`);
    } else {
      console.error('Error creating config file');
    }
    process.exit(1);
  }
}

/**
 * Prompt user before overwriting existing config
 */
async function promptBeforeOverwrite(configPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      `Config file(s) exist: ${configPath}. Overwrite? (y/N) `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      }
    );
  });
}
