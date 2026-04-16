/**
 * Init Command
 *
 * Scaffolds a specs.config.yaml file with production-ready defaults
 * and inline documentation for getting started with Specs CLI.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import readline from 'readline';
import { generateConfigTemplate } from '../Config/ConfigTemplates.js';

export const Init = new Command('init')
  .description('Initialize a specs.config.yaml file with production defaults')
  .option('--force', 'Overwrite existing config without prompting')
  .option('-c, --config <path>', 'Custom path for config file (default: specs.config.yaml)')
  .action(async (options) => {
    await initCommand(options as { force?: boolean; config?: string });
  });

/**
 * Initialize config file
 */
async function initCommand(options: { force?: boolean; config?: string }): Promise<void> {
  const configPath = options.config || 'specs.config.yaml';
  const configExists = fs.existsSync(configPath);

  if (configExists && !options.force) {
    // Prompt before overwriting
    const shouldOverwrite = await promptBeforeOverwrite(configPath);
    if (!shouldOverwrite) {
      console.log('Config initialization cancelled.');
      return;
    }
  }

  try {
    const template = generateConfigTemplate();
    fs.writeFileSync(configPath, template, 'utf-8');
    console.log(`✓ Created ${configPath}`);
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
      `Config file exists at ${configPath}. Overwrite? (y/N) `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      }
    );
  });
}
