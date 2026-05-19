import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { Generate } from "../../../src/commands/GenerateCommand.js";
import { ManifestParser } from "../../../src/utilities/ManifestParser.js";
import { ManifestParserV2 } from "../../../src/utilities/ManifestParserV2.js";
import { isV1Manifest } from "../../../src/utilities/ManifestMigrationV1ToV2.js";
import { LicenseStatus } from "../../../src/utilities/LicenseStatus.js";
import type { ComponentsData } from "@directededges/specs-from-figma";

// ============================================================================
// COMMAND REGISTRATION
// ============================================================================

describe("GenerateCommand", () => {
  describe("registration", () => {
    it("registers name and description", () => {
      expect(Generate.name()).toBe("generate");
      expect(Generate.description()).toContain("Generate");
    });

    it("has source as an optional argument (defaults to manifest from config)", () => {
      const args = Generate.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe("source");
      expect(args[0].required).toBe(false);
    });

    it("component option is not mandatory (optional for manifest mode)", () => {
      const componentOption = Generate.options.find(
        (o) => o.long === "--component",
      );
      expect(componentOption).toBeDefined();
      // mandatory means the option itself must be provided; required means its value needs an argument
      // component is optional (.option not .requiredOption) but takes a required value <name|id>
      expect(componentOption!.mandatory).toBeFalsy();
    });

    it("registers all expected options", () => {
      const options = Generate.options
        .map((option) => option.long)
        .filter(Boolean);

      expect(options).toContain("--component");
      expect(options).toContain("--license");
      expect(options).toContain("--format");
      expect(options).toContain("--output");
      expect(options).toContain("--variables");
      expect(options).toContain("--styles");
      expect(options).toContain("--data-dir");
      expect(options).toContain("--config");
      expect(options).toContain("--split-components");
      expect(options).toContain("--split-concerns");
      expect(options).toContain("--use-subfolders");
      expect(options).toContain("--verbose");
    });

    it("has short aliases for key options", () => {
      const shorts = Generate.options.map((o) => o.short).filter(Boolean);

      expect(shorts).toContain("-c");
      expect(shorts).toContain("-l");
      expect(shorts).toContain("-f");
      expect(shorts).toContain("-o");
      expect(shorts).toContain("-v");
      expect(shorts).toContain("-s");
    });

    it("split-components has no Commander default (defers to config)", () => {
      const opt = Generate.options.find((o) => o.long === "--split-components");
      expect(opt!.defaultValue).toBeUndefined();
    });

    it("split-concerns has no Commander default (defers to config)", () => {
      const opt = Generate.options.find((o) => o.long === "--split-concerns");
      expect(opt!.defaultValue).toBeUndefined();
    });

    it("use-subfolders has no Commander default (defers to config)", () => {
      const opt = Generate.options.find((o) => o.long === "--use-subfolders");
      expect(opt!.defaultValue).toBeUndefined();
    });

    it("verbose defaults to false", () => {
      const opt = Generate.options.find((o) => o.long === "--verbose");
      expect(opt!.defaultValue).toBe(false);
    });
  });
});

// ============================================================================
// MANIFEST PARSING (T01 + T03)
// ============================================================================

describe("parseManifest", () => {
  describe("component parsing", () => {
    it("parses checked components as included", () => {
      const manifest = `# Components\n- [x] DS Button (123:456, COMPONENT_SET)\n- [x] DS Alert (789:012, COMPONENT)`;
      const { components } = ManifestParser.parse(manifest);

      expect(components).toHaveLength(2);
      expect(components[0]).toEqual({
        id: "123:456",
        name: "DS Button",
        type: "COMPONENT_SET",
        included: true,
      });
      expect(components[1]).toEqual({
        id: "789:012",
        name: "DS Alert",
        type: "COMPONENT",
        included: true,
      });
    });

    it("parses unchecked components as excluded", () => {
      const manifest = `- [ ] DS Button (123:456, COMPONENT_SET)`;
      const { components } = ManifestParser.parse(manifest);

      expect(components).toHaveLength(1);
      expect(components[0].included).toBe(false);
    });

    it("handles mixed checked and unchecked", () => {
      const manifest = [
        "- [x] Button (1:1, COMPONENT_SET)",
        "- [ ] Alert (2:2, COMPONENT)",
        "- [x] Modal (3:3, COMPONENT_SET)",
        "- [ ] Tooltip (4:4, COMPONENT)",
      ].join("\n");

      const { components } = ManifestParser.parse(manifest);

      expect(components).toHaveLength(4);
      expect(components.filter((c) => c.included)).toHaveLength(2);
      expect(components.filter((c) => !c.included)).toHaveLength(2);
    });

    it("returns empty array for content with no checkbox lines", () => {
      const manifest = `# Just a heading\nSome text without checkboxes`;
      const { components } = ManifestParser.parse(manifest);
      expect(components).toHaveLength(0);
    });

    it("ignores lines that do not match component format", () => {
      const manifest = [
        "# Components",
        "- [x] DS Button (123:456, COMPONENT_SET)",
        "- Some regular bullet",
        "- [x] Has no parens",
        "  - [x] Indented checkbox (nested, COMPONENT)",
        "- [x] DS Alert (789:012, COMPONENT)",
      ].join("\n");

      const { components } = ManifestParser.parse(manifest);
      // Only lines matching full format are parsed
      expect(components).toHaveLength(2);
      expect(components[0].name).toBe("DS Button");
      expect(components[1].name).toBe("DS Alert");
    });

    it("handles COMPONENT_SET type case-insensitively", () => {
      const manifest = `- [x] Button (1:1, component_set)`;
      const { components } = ManifestParser.parse(manifest);

      expect(components[0].type).toBe("COMPONENT_SET");
    });

    it("handles COMPONENT type case-insensitively", () => {
      const manifest = `- [x] Icon (1:1, component)`;
      const { components } = ManifestParser.parse(manifest);

      expect(components[0].type).toBe("COMPONENT");
    });

    it("extracts component names with special characters", () => {
      const manifest = `- [x] DS Button/Primary (123:456, COMPONENT_SET)`;
      const { components } = ManifestParser.parse(manifest);

      expect(components[0].name).toBe("DS Button/Primary");
    });
  });

  describe("metadata extraction", () => {
    it("extracts File metadata from header", () => {
      const manifest = [
        "# Component Manifest",
        "**File:** data/library.file.json",
        "",
        "- [x] Button (1:1, COMPONENT_SET)",
      ].join("\n");

      const { metadata } = ManifestParser.parse(manifest);
      expect(metadata.file).toBe("data/library.file.json");
    });

    it("trims whitespace from File metadata", () => {
      const manifest = `**File:**   data/library.file.json   \n- [x] Button (1:1, COMPONENT_SET)`;
      const { metadata } = ManifestParser.parse(manifest);
      expect(metadata.file).toBe("data/library.file.json");
    });

    it("returns undefined file when no File header present", () => {
      const manifest = `- [x] Button (1:1, COMPONENT_SET)`;
      const { metadata } = ManifestParser.parse(manifest);
      expect(metadata.file).toBeUndefined();
    });
  });

  describe("realistic manifest", () => {
    it("parses a full audit-generated manifest", () => {
      const manifest = [
        "# Component Audit",
        "",
        "**File:** data/library.file.json",
        "**Generated:** 2026-03-21",
        "",
        "## Components (5 total)",
        "",
        "- [x] DS Accordion (5507:100, COMPONENT_SET)",
        "- [x] DS Alert (5507:200, COMPONENT_SET)",
        "- [ ] DS Avatar (5507:300, COMPONENT_SET)",
        "- [x] DS Button (5507:400, COMPONENT_SET)",
        "- [ ] DS Card (5507:500, COMPONENT_SET)",
      ].join("\n");

      const { components, metadata } = ManifestParser.parse(manifest);

      expect(components).toHaveLength(5);
      expect(components.filter((c) => c.included)).toHaveLength(3);
      expect(metadata.file).toBe("data/library.file.json");

      const selected = components.filter((c) => c.included);
      expect(selected.map((c) => c.name)).toEqual([
        "DS Accordion",
        "DS Alert",
        "DS Button",
      ]);
      expect(selected.map((c) => c.id)).toEqual([
        "5507:100",
        "5507:200",
        "5507:400",
      ]);
    });
  });
});

// ============================================================================
// SOURCE AUTO-DETECTION (T01)
// ============================================================================

describe("source auto-detection", () => {
  // These mirror the detection logic in GenerateCommand:
  //   isJson         = trimmed.startsWith('{')
  //   isV2Manifest   = ManifestParserV2.isV2(content)
  //   isV1Manifest   = !isV2Manifest && isV1Manifest(content)
  //   isManifest     = isV2Manifest || isV1Manifest

  function detect(content: string) {
    const trimmed = content.trimStart();
    const isJson = trimmed.startsWith("{");
    const isV2 = ManifestParserV2.isV2(content);
    const isV1 = !isV2 && isV1Manifest(content);
    const isManifest = isV2 || isV1;
    return { isJson, isV2, isV1, isManifest };
  }

  it("JSON content is detected by leading brace", () => {
    const { isJson, isManifest } = detect('{ "name": "test" }');
    expect(isJson).toBe(true);
    expect(isManifest).toBe(false);
  });

  it("v1 manifest is detected via isV1Manifest", () => {
    const v1 = "# Manifest\n- [x] Button (1:1, COMPONENT_SET)";
    const { isJson, isV1, isV2, isManifest } = detect(v1);
    expect(isJson).toBe(false);
    expect(isV1).toBe(true);
    expect(isV2).toBe(false);
    expect(isManifest).toBe(true);
  });

  it("v2 manifest (scan table) is detected via ManifestParserV2.isV2", () => {
    const v2 = [
      "# Component Manifest",
      "",
      "**Scan format version:** 2",
      "**File:** data/library.file.json",
      "",
      "## Components",
      "",
      "| ✓ | Name | ID | Type | Dev Status |",
      "|---|---|---|---|---|",
      "| [x] | Button | 1:23 | COMPONENT_SET | NONE |",
    ].join("\n");
    const { isJson, isV1, isV2, isManifest } = detect(v2);
    expect(isJson).toBe(false);
    expect(isV2).toBe(true);
    expect(isV1).toBe(false);
    expect(isManifest).toBe(true);
  });

  it("v2 manifest still routes through ManifestParserV2.parse", () => {
    const v2 = [
      "**Scan format version:** 2",
      "**File:** data/library.file.json",
      "",
      "## Components",
      "",
      "| ✓ | Name | ID | Type | Dev Status |",
      "|---|---|---|---|---|",
      "| [x] | DS Button | 5507:400 | COMPONENT_SET | NONE |",
      "| [ ] | DS Card | 5507:500 | COMPONENT | NONE |",
    ].join("\n");
    const { components, metadata } = ManifestParserV2.parse(v2);
    expect(metadata.file).toBe("data/library.file.json");
    expect(components.filter((c) => c.included).map((c) => c.id)).toEqual([
      "5507:400",
    ]);
  });

  it("JSON with leading whitespace is still detected", () => {
    const { isJson } = detect('  \n  { "name": "test" }');
    expect(isJson).toBe(true);
  });

  it("plain text is neither JSON nor manifest", () => {
    const { isJson, isManifest } = detect("Hello world, this is plain text.");
    expect(isJson).toBe(false);
    expect(isManifest).toBe(false);
  });

  it("YAML is neither JSON nor manifest", () => {
    const { isJson, isManifest } = detect(
      "components:\n  button:\n    title: Button",
    );
    expect(isJson).toBe(false);
    expect(isManifest).toBe(false);
  });
});

// ============================================================================
// LICENSE KEY RESOLUTION (T04)
// ============================================================================

describe("license key resolution", () => {
  // The resolution logic in GenerateCommand:
  //   const licenseKey = options.license || process.env.ANOVA_LICENSE_KEY;
  //   const licenseInput = licenseKey ? { key: licenseKey } : undefined;

  it("--license flag produces license input", () => {
    const optionsLicense = "lic_abc";
    const envKey = undefined;
    const licenseKey = optionsLicense || envKey;
    expect(licenseKey).toBe("lic_abc");
    expect(licenseKey ? { key: licenseKey } : undefined).toEqual({
      key: "lic_abc",
    });
  });

  it("env var produces license input when no flag", () => {
    const optionsLicense = undefined;
    const envKey = "lic_env";
    const licenseKey = optionsLicense || envKey;
    expect(licenseKey).toBe("lic_env");
    expect(licenseKey ? { key: licenseKey } : undefined).toEqual({
      key: "lic_env",
    });
  });

  it("--license flag wins over env var", () => {
    const optionsLicense = "lic_flag";
    const envKey = "lic_env";
    const licenseKey = optionsLicense || envKey;
    expect(licenseKey).toBe("lic_flag");
  });

  it("neither flag nor env var produces undefined", () => {
    const optionsLicense = undefined;
    const envKey = undefined;
    const licenseKey = optionsLicense || envKey;
    expect(licenseKey).toBeUndefined();
    expect(licenseKey ? { key: licenseKey } : undefined).toBeUndefined();
  });
});

// ============================================================================
// LICENSE STATUS DISPLAY (T05)
// ============================================================================

describe("displayLicenseStatus", () => {
  let logSpy: MockInstance;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function makeResult(
    licenseLevel: string,
    licenseStatus: string,
  ): ComponentsData[] {
    return [
      {
        name: "Button",
        component: {
          title: "Button",
          metadata: {
            generator: {
              license: { level: licenseLevel, status: licenseStatus },
            },
          },
        },
      },
    ] as any;
  }

  it("displays PRO (active) for active PRO license", () => {
    LicenseStatus.display(makeResult("PRO", "active"), true);

    expect(logSpy).toHaveBeenCalledWith("License: PRO (active)");
  });

  it("displays FREE (invalid) for invalid key", () => {
    LicenseStatus.display(makeResult("FREE", "invalid"), true);

    expect(logSpy).toHaveBeenCalledWith(
      "License: FREE (invalid — key not recognized)",
    );
  });

  it("displays FREE (expired) for expired key", () => {
    LicenseStatus.display(makeResult("FREE", "expired"), true);

    expect(logSpy).toHaveBeenCalledWith(
      "License: FREE (expired — key expired)",
    );
  });

  it("displays FREE (activation-limit-reached) for exhausted seats", () => {
    LicenseStatus.display(makeResult("FREE", "activation-limit-reached"), true);

    expect(logSpy).toHaveBeenCalledWith(
      "License: FREE (activation-limit-reached — all seats consumed for this key)",
    );
  });

  it("displays FREE (network-error) for license server failure", () => {
    LicenseStatus.display(makeResult("FREE", "network-error"), true);

    expect(logSpy).toHaveBeenCalledWith(
      "License: FREE (network-error — could not reach license server)",
    );
  });

  it("displays nothing when no license key was provided", () => {
    LicenseStatus.display(makeResult("FREE", "active"), false);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("displays nothing when results have no successful components", () => {
    const errorResults: ComponentsData[] = [
      { name: "Button", error: "Component not found" } as any,
    ];

    LicenseStatus.display(errorResults, true);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("displays nothing when component has no generator metadata", () => {
    const results: ComponentsData[] = [
      {
        name: "Button",
        component: { title: "Button", metadata: {} },
      },
    ] as any;

    LicenseStatus.display(results, true);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("displays nothing when component has no license in generator", () => {
    const results: ComponentsData[] = [
      {
        name: "Button",
        component: { title: "Button", metadata: { generator: {} } },
      },
    ] as any;

    LicenseStatus.display(results, true);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("uses first successful result for license info (multiple results)", () => {
    const results: ComponentsData[] = [
      { name: "Button", error: "failed" } as any,
      {
        name: "Alert",
        component: {
          title: "Alert",
          metadata: {
            generator: { license: { level: "PRO", status: "active" } },
          },
        },
      } as any,
      {
        name: "Modal",
        component: {
          title: "Modal",
          metadata: {
            generator: { license: { level: "PRO", status: "active" } },
          },
        },
      } as any,
    ];

    LicenseStatus.display(results, true);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("License: PRO (active)");
  });

  it("handles unknown status gracefully", () => {
    LicenseStatus.display(makeResult("FREE", "some-future-status"), true);

    // Falls through to default: uses status as its own description
    expect(logSpy).toHaveBeenCalledWith(
      "License: FREE (some-future-status — some-future-status)",
    );
  });
});

// ============================================================================
// OUTPUT PATH RESOLUTION (#34)
// ============================================================================

describe("output path resolution", () => {
  // Tests the logic that prevents EISDIR when outputDirectory is an existing
  // directory in single-file mode. The fix appends `library.{format}` when
  // outputPath is an existing directory and no split mode is active.

  it("appends default filename when outputPath is a directory in single-file mode", () => {
    // Simulates the fix logic from GenerateCommand
    const isSingleFileMode = true;
    const isDirectory = true;
    const outputPath = "/project/specs";
    const resolvedFormat = "yaml";

    const result =
      isSingleFileMode && isDirectory
        ? `${outputPath}/library.${resolvedFormat}`
        : outputPath;

    expect(result).toBe("/project/specs/library.yaml");
  });

  it("appends library.json when format is json", () => {
    const isSingleFileMode = true;
    const isDirectory = true;
    const outputPath = "/project/specs";
    const resolvedFormat = "json";

    const result =
      isSingleFileMode && isDirectory
        ? `${outputPath}/library.${resolvedFormat}`
        : outputPath;

    expect(result).toBe("/project/specs/library.json");
  });

  it("does not modify outputPath in split-components mode even if path is a directory", () => {
    const isSingleFileMode = false; // splitComponents is true
    const isDirectory = true;
    const outputPath = "/project/specs";
    const resolvedFormat = "yaml";

    const result =
      isSingleFileMode && isDirectory
        ? `${outputPath}/library.${resolvedFormat}`
        : outputPath;

    expect(result).toBe("/project/specs");
  });

  it("does not modify outputPath when path is a file (not a directory)", () => {
    const isSingleFileMode = true;
    const isDirectory = false;
    const outputPath = "/project/specs.yaml";
    const resolvedFormat = "yaml";

    const result =
      isSingleFileMode && isDirectory
        ? `${outputPath}/library.${resolvedFormat}`
        : outputPath;

    expect(result).toBe("/project/specs.yaml");
  });
});

// ============================================================================
// RESULT DISCRIMINATION
// ============================================================================

describe("result discrimination", () => {
  // Tests the pattern used in GenerateCommand to separate successes from errors:
  //   for (const result of results) {
  //     if ('component' in result) { ... success ... }
  //     else { ... error ... }
  //   }

  it("success results have component property", () => {
    const success: ComponentsData = {
      name: "Button",
      component: { title: "Button" },
    } as any;

    expect("component" in success).toBe(true);
    expect("error" in success).toBe(false);
  });

  it("error results have error property", () => {
    const error: ComponentsData = {
      name: "Button",
      error: "Component not found",
    } as any;

    expect("error" in error).toBe(true);
    expect("component" in error).toBe(false);
  });

  it("mixed results are separated correctly", () => {
    const results: ComponentsData[] = [
      { name: "Button", component: { title: "Button" } } as any,
      { name: "Alert", error: "Component not found" } as any,
      { name: "Modal", component: { title: "Modal" } } as any,
    ];

    const successes = results.filter((r) => "component" in r);
    const errors = results.filter((r) => "error" in r);

    expect(successes).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toHaveProperty("name", "Alert");
  });
});
