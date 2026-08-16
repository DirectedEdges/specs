/**
 * Variables index construction from a fetched variables JSON file.
 *
 * A spec references a variable by name and nothing else. This index is what gives that name
 * meaning: it maps each token name onto the handles needed to reach the actual variable — the
 * library key, and the id it has in the file it was fetched from. The fetched
 * `/v1/files/:key/variables/local` response is the only place a variable's name, key and id
 * appear together, which is why the mapping is built here rather than recorded in the spec.
 *
 * @packageDocumentation
 */

/** The handles a token name resolves to. `key` imports the variable from the team library and
 *  is authoritative for any file. `id` identifies it within the file it was fetched from, and
 *  is the fallback when a library import is unavailable. `published` is false for a variable
 *  hidden from publishing, which cannot be imported by key at all. */
export interface VariableEntry {
  key: string;
  id: string;
  published: boolean;
}

/** Token name (`collectionName/variableName`) → the handles that name resolves to. */
export type VariablesIndex = Record<string, VariableEntry>;

interface VariablesJson {
  meta?: {
    variables?: Record<string, {
      name?: string;
      key?: string;
      variableCollectionId?: string;
      hiddenFromPublishing?: boolean;
    }>;
    variableCollections?: Record<string, { name?: string }>;
  };
}

/**
 * Build the token-name index from parsed variables JSON.
 *
 * A variable with no name is omitted: the name is the only thing a spec can reference it by,
 * so an unnamed variable is unreachable regardless of what else is known about it. A variable
 * with no key is kept — its id still resolves when rendering into the file it came from.
 *
 * @param data - Parsed contents of a `*.variables.json` file
 * @returns Index keyed by token name
 */
export function buildVariablesIndex(data: VariablesJson | null | undefined): VariablesIndex {
  const vars = data?.meta?.variables;
  const cols = data?.meta?.variableCollections;
  if (!vars || !cols) return {};

  const colNames: Record<string, string> = {};
  for (const [id, col] of Object.entries(cols)) {
    if (col.name) colNames[id] = col.name;
  }

  const index: VariablesIndex = {};
  for (const [id, varDef] of Object.entries(vars)) {
    if (!varDef.name) continue;
    const colName = (varDef.variableCollectionId ? colNames[varDef.variableCollectionId] : undefined) ?? '';
    const tokenName = colName ? `${colName}/${varDef.name}` : varDef.name;
    index[tokenName] = {
      key: varDef.key ?? '',
      id,
      published: varDef.key != null && varDef.hiddenFromPublishing !== true,
    };
  }

  return index;
}

/** Count of names that cannot be imported from the library, for operator-facing logging. */
export function countUnpublished(index: VariablesIndex): number {
  return Object.values(index).filter(e => !e.published).length;
}
