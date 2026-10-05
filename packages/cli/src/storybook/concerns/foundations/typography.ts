// Typography foundations: the join of each file's style map (root.json) with
// type properties sampled from its page payloads, done here in Node where the
// tens-of-megabytes payloads are readable (specs#632). typography.json carries
// the full property set the CSS `font` shorthand cannot.

export interface TypeStyleProperties {
  fontFamily: string;
  fontStyle?: string;
  fontWeight: number;
  fontSize: number;
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightUnit?: string;
  textCase?: string;
  textDecoration?: string;
}

export interface TypographyEntry {
  id: string;
  name: string;
  description: string;
  source: string;
  remote: boolean;
  /** Null when no node in the file uses the style, so nothing resolves it. */
  style: TypeStyleProperties | null;
}

export interface TypographyJson {
  styles: TypographyEntry[];
}

export interface TypographySourceInput {
  alias: string;
  /** root.json's `styles` map. */
  styleMap: Record<string, { name: string; key: string; styleType: string; description?: string; remote?: boolean }>;
  /** Style id → sampled node `style` object (one usage is enough — every node bound to a style reports the same properties). */
  sampledText: Record<string, Record<string, unknown>>;
}

const KEEP: Array<keyof TypeStyleProperties> = [
  'fontFamily', 'fontStyle', 'fontWeight', 'fontSize', 'letterSpacing',
  'lineHeightPx', 'lineHeightPercent', 'lineHeightUnit', 'textCase', 'textDecoration',
];

export function buildTypographyData(sources: TypographySourceInput[]): TypographyJson | null {
  const styles: TypographyEntry[] = [];
  for (const src of sources) {
    for (const [id, style] of Object.entries(src.styleMap)) {
      if (style.styleType !== 'TEXT') continue;
      const sampled = src.sampledText[id];
      let properties: TypeStyleProperties | null = null;
      if (sampled) {
        const picked: Partial<TypeStyleProperties> = {};
        for (const key of KEEP) {
          const value = sampled[key];
          if (value !== undefined) (picked as Record<string, unknown>)[key] = value;
        }
        properties = picked as TypeStyleProperties;
      }
      styles.push({
        id,
        name: style.name,
        description: style.description ?? '',
        source: src.alias,
        remote: Boolean(style.remote),
        style: properties,
      });
    }
  }
  return styles.length > 0 ? { styles } : null;
}
