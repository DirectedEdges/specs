/**
 * Validate Command
 *
 * Validates spec folders against the schema package — each concern file against
 * its JSON Schema definition, then the references JSON Schema cannot check:
 * prop bindings, slot content pointers, instanceOf targets, layout and element
 * names against anatomy, and configuration values against declared props.
 * Reads only; nothing here writes or needs a license.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { ConfigLoader } from '../config/ConfigLoader.js';
import { runValidate, type Finding } from '../validate/run.js';
import { ERROR_CODES } from '../utilities/errorCodes.js';

function formatText(findings: Finding[], counts: { component: number; composition: number }): void {
  for (const f of findings) {
    const mark = f.level === 'error' ? '✗' : '⚠';
    const kindDir = f.kind === 'component' ? 'components' : 'compositions';
    console.log(`${mark} ${kindDir}/${f.spec}/${f.file} ${f.path} — ${f.message}`);
  }
  const errors = findings.filter(f => f.level === 'error').length;
  const warnings = findings.filter(f => f.level === 'warning').length;
  const specs = counts.component + counts.composition;
  const scope = `${specs} ${specs === 1 ? 'spec' : 'specs'} (components ${counts.component}, compositions ${counts.composition})`;
  if (errors === 0 && warnings === 0) {
    console.log(`✓ ${scope} valid`);
  } else {
    console.log(`${errors === 0 ? '✓' : '✗'} ${errors} ${errors === 1 ? 'error' : 'errors'}, ${warnings} ${warnings === 1 ? 'warning' : 'warnings'} across ${scope}`);
  }
}

export const Validate = new Command('validate')
  .description('Validate specs against the schema and check every cross-file reference')
  .argument('[components...]', 'Spec folder names to validate (default: the whole catalogue)')
  .option('--config <path>', 'Path to a config/ directory')
  .option('-o, --output <dir>', 'Specs directory (default: spec.directory from settings)')
  .option('--authored', 'Authored spec: a missing metadata.source is a warning, not an error')
  .option('--format <format>', 'Output format: text or json', 'text')
  .action((components: string[], options: { config?: string; output?: string; authored?: boolean; format: string }) => {
    try {
      if (options.format !== 'text' && options.format !== 'json') {
        console.error(`Error: unknown format "${options.format}" — use text or json.`);
        process.exit(ERROR_CODES.INVALID_ARGS);
      }

      const config = new ConfigLoader().load(options.config);
      const specsPath = options.output
        ? path.resolve(options.output)
        : config.settings.spec.directory
          ? path.resolve(config.settings.spec.directory)
          : path.resolve(process.cwd());

      if (!fs.existsSync(specsPath)) {
        console.error(`Error: specs directory not found: ${specsPath}`);
        process.exit(ERROR_CODES.FILE_ERROR);
      }

      const result = runValidate({
        specsPath,
        components: components.length > 0 ? components : undefined,
        authored: options.authored,
      });

      for (const name of result.missing) {
        console.warn(`Warning: component "${name}" not found in ${specsPath} — skipping`);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify({
          specs: result.counts,
          errors: result.findings.filter(f => f.level === 'error'),
          warnings: result.findings.filter(f => f.level === 'warning'),
        }, null, 2));
      } else {
        formatText(result.findings, result.counts);
      }

      const hasErrors = result.findings.some(f => f.level === 'error');
      process.exit(hasErrors ? ERROR_CODES.VALIDATION_FAILED : ERROR_CODES.SUCCESS);
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`);
      process.exit(ERROR_CODES.GENERAL_ERROR);
    }
  });
