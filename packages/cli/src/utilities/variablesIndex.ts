/**
 * Variables index construction from a fetched variables JSON file.
 *
 * The file downloaded by `specs fetch` (`/v1/files/:key/variables/local`) is the only place
 * a variable's key, id, name and collection appear together. Render consumers reach a
 * variable by whichever identifier the spec happens to carry — an id from
 * `$extensions['com.figma'].id`, or a token path when the spec has no Figma extensions at
 * all — so the index is built on both axes from the same pass.
 *
 * @packageDocumentation
 */

/** A variable's key plus whether it is published. Only published variables live in the team
 *  library, which is the only source `importVariableByKeyAsync` can load from. */
export interface VariableEntry {
  key: string;
  published: boolean;
}

/** Both lookup axes over the same entries. `byId` is keyed by Figma variable id
 *  (`VariableID:1:23`), `byPath` by `collectionName/variableName`. */
export interface VariablesIndex {
  byId: Record<string, VariableEntry>;
  byPath: Record<string, VariableEntry>;
}

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
 * Build the id and path indexes from parsed variables JSON.
 *
 * A variable with no key is indexed on neither axis: the key is the only thing either axis
 * exists to supply. Entries missing a name are still reachable by id.
 *
 * @param data - Parsed contents of a `*.variables.json` file
 * @returns Index keyed by variable id and by token path
 */
export function buildVariablesIndex(data: VariablesJson | null | undefined): VariablesIndex {
  const empty: VariablesIndex = { byId: {}, byPath: {} };
  const vars = data?.meta?.variables;
  const cols = data?.meta?.variableCollections;
  if (!vars || !cols) return empty;

  const colNames: Record<string, string> = {};
  for (const [id, col] of Object.entries(cols)) {
    if (col.name) colNames[id] = col.name;
  }

  const index: VariablesIndex = { byId: {}, byPath: {} };
  for (const [id, varDef] of Object.entries(vars)) {
    const key = varDef.key;
    if (!key) continue;

    const entry: VariableEntry = { key, published: varDef.hiddenFromPublishing !== true };
    index.byId[id] = entry;

    if (!varDef.name) continue;
    const colName = (varDef.variableCollectionId ? colNames[varDef.variableCollectionId] : undefined) ?? '';
    index.byPath[colName ? `${colName}/${varDef.name}` : varDef.name] = entry;
  }

  return index;
}

/** Count of entries hidden from publishing, for operator-facing logging. */
export function countUnpublished(index: VariablesIndex): number {
  return Object.values(index.byId).filter(e => !e.published).length;
}
