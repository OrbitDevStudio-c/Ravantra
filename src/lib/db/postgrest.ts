/* eslint-disable @typescript-eslint/no-explicit-any -- untyped rows, matching supabase-js without generated types (callers narrow) */
import "server-only";
import type { PoolClient } from "@neondatabase/serverless";
import { getMeta, type ForeignKey, type SchemaMeta } from "./meta";

/**
 * A small, server-side PostgREST-compatible query builder over Postgres.
 *
 * It implements the subset of the supabase-js API this app uses —
 * select (with embedded relations, aliases and `!inner`), filters, ordering,
 * paging, counts, insert / update / upsert / delete and rpc — and returns the
 * same `{ data, error, count }` shapes. Results are serialised to JSON in SQL,
 * so numerics, timestamps and nested rows look exactly like PostgREST output.
 *
 * Every value is sent as a bound parameter; identifiers are validated.
 */

export interface DbError {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
}
export interface DbResult<T = any> {
  data: T | null;
  error: DbError | null;
  count: number | null;
  status: number;
  statusText: string;
}

export type Runner = <T>(fn: (c: PoolClient) => Promise<T>) => Promise<T>;

const IDENT = /^[a-z_][a-z0-9_]*$/i;
function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}
const CAST = /^[a-z_][a-z0-9_ ]*(\[\])?$/i;

class Params {
  values: unknown[] = [];
  add(v: unknown): string {
    this.values.push(v);
    return `$${this.values.length}`;
  }
}

function toError(e: unknown): DbError {
  const err = e as { message?: string; code?: string; detail?: string; hint?: string };
  return { message: err?.message ?? String(e), code: err?.code ?? "", details: err?.detail ?? null, hint: err?.hint ?? null };
}

/* ------------------------------------------------------------------ */
/* Select-string parsing                                                */
/* ------------------------------------------------------------------ */

type SelectNode =
  | { kind: "star" }
  | { kind: "col"; name: string; alias?: string; cast?: string }
  | { kind: "embed"; key: string; relation: string; inner: boolean; hint?: string; children: SelectNode[] };

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

function parseSelect(input: string): SelectNode[] {
  const s = input.replace(/\s+/g, " ").trim();
  if (!s) return [{ kind: "star" }];
  return splitTop(s).map((item): SelectNode => {
    if (item === "*") return { kind: "star" };
    const open = item.indexOf("(");
    if (open !== -1 && item.endsWith(")")) {
      const head = item.slice(0, open).trim();
      const inner = item.slice(open + 1, -1);
      let alias: string | undefined;
      let rest = head;
      const colon = head.indexOf(":");
      if (colon !== -1) {
        alias = head.slice(0, colon).trim();
        rest = head.slice(colon + 1).trim();
      }
      const [relation, ...bangs] = rest.split("!").map((x) => x.trim());
      const isInner = bangs.includes("inner");
      const hint = bangs.find((b) => b !== "inner" && b !== "left");
      return { kind: "embed", key: alias ?? relation, relation, inner: isInner, hint, children: parseSelect(inner) };
    }
    let alias: string | undefined;
    let rest = item;
    const colon = item.indexOf(":");
    if (colon !== -1 && item[colon + 1] !== ":") {
      alias = item.slice(0, colon).trim();
      rest = item.slice(colon + 1).trim();
    }
    const [name, cast] = rest.split("::").map((x) => x.trim());
    if (cast && !CAST.test(cast)) throw new Error(`Invalid cast: ${cast}`);
    return { kind: "col", name, alias, cast };
  });
}

/* ------------------------------------------------------------------ */
/* Relationship resolution                                              */
/* ------------------------------------------------------------------ */

type Rel = { type: "many-to-one" | "one-to-many" | "one-to-one"; fk: ForeignKey };

function sameCols(a: string[], b: string[]) {
  return a.length === b.length && a.every((c) => b.includes(c));
}

function resolveRel(meta: SchemaMeta, parent: string, relation: string, hint?: string): Rel {
  const matchHint = (fk: ForeignKey) => !hint || fk.name === hint || fk.columns.includes(hint);
  const toOne = meta.fks.filter((fk) => fk.table === parent && fk.refTable === relation && matchHint(fk));
  if (toOne.length) return { type: "many-to-one", fk: toOne[0] };
  const toMany = meta.fks.filter((fk) => fk.table === relation && fk.refTable === parent && matchHint(fk));
  if (toMany.length) {
    const fk = toMany[0];
    const unique = (meta.uniques.get(relation) ?? []).some((u) => sameCols(u, fk.columns));
    return { type: unique ? "one-to-one" : "one-to-many", fk };
  }
  throw new Error(`Could not find a relationship between '${parent}' and '${relation}'`);
}

/* ------------------------------------------------------------------ */
/* Filters                                                              */
/* ------------------------------------------------------------------ */

type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "is" | "cs";
interface Filter {
  /** [] = root table; ["product"] = embedded resource by key */
  path: string[];
  column: string;
  op: FilterOp;
  value: unknown;
  negate?: boolean;
}
interface OrGroup {
  path: string[];
  parts: Filter[];
}

const OPS: Record<Exclude<FilterOp, "in" | "is" | "cs">, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "like",
  ilike: "ilike",
};

function filterSql(alias: string, f: Filter, p: Params): string {
  const col = `${alias}.${ident(f.column)}`;
  let sql: string;
  switch (f.op) {
    case "in":
      sql = `${col} = any(${p.add(f.value)})`;
      break;
    case "is": {
      const v = f.value === null || f.value === "null" ? "null" : f.value === true || f.value === "true" ? "true" : f.value === false || f.value === "false" ? "false" : null;
      if (!v) throw new Error(`Invalid "is" value: ${String(f.value)}`);
      sql = `${col} is ${v}`;
      break;
    }
    case "cs":
      sql = `${col} @> ${p.add(f.value)}`;
      break;
    case "like":
    case "ilike":
      sql = `${col} ${OPS[f.op]} ${p.add(String(f.value).replace(/\*/g, "%"))}`;
      break;
    default:
      sql = `${col} ${OPS[f.op]} ${p.add(f.value)}`;
  }
  return f.negate ? `not (${sql})` : sql;
}

/** Parse PostgREST's `or` syntax: "a.ilike.%x%,b.eq.3" (values may contain dots). */
function parseOr(expr: string, path: string[]): Filter[] {
  return splitTop(expr).map((part) => {
    const m = /^([a-z_][a-z0-9_]*)\.(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\.(.*)$/is.exec(part.trim());
    if (!m) throw new Error(`Unsupported or() condition: ${part}`);
    const [, column, not, op, raw] = m;
    const value = op === "in" ? raw.replace(/^\(|\)$/g, "").split(",").map((x) => x.trim()) : raw;
    return { path, column, op: op as FilterOp, value, negate: Boolean(not) };
  });
}

function splitPath(column: string): { path: string[]; column: string } {
  const parts = column.split(".");
  return { path: parts.slice(0, -1), column: parts[parts.length - 1] };
}

/* ------------------------------------------------------------------ */
/* SQL generation for selects                                           */
/* ------------------------------------------------------------------ */

interface Order {
  path: string[];
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

interface Scope {
  meta: SchemaMeta;
  p: Params;
  filters: Filter[];
  ors: OrGroup[];
  orders: Order[];
  limits: Map<string, number>;
  n: { i: number };
}

const pathKey = (path: string[]) => path.join(".");

function whereFor(scope: Scope, alias: string, path: string[]): string[] {
  const k = pathKey(path);
  const out = scope.filters.filter((f) => pathKey(f.path) === k).map((f) => filterSql(alias, f, scope.p));
  for (const g of scope.ors.filter((o) => pathKey(o.path) === k)) {
    out.push(`(${g.parts.map((f) => filterSql(alias, f, scope.p)).join(" or ")})`);
  }
  return out;
}

function orderFor(scope: Scope, alias: string, path: string[]): string {
  const k = pathKey(path);
  const parts = scope.orders
    .filter((o) => pathKey(o.path) === k)
    .map((o) => `${alias}.${ident(o.column)} ${o.ascending ? "asc" : "desc"}${o.nullsFirst === undefined ? "" : o.nullsFirst ? " nulls first" : " nulls last"}`);
  return parts.length ? ` order by ${parts.join(", ")}` : "";
}

/** Column list for `table` aliased as `alias`; also returns `exists` conditions for !inner embeds. */
function columns(scope: Scope, table: string, alias: string, nodes: SelectNode[], path: string[]): { cols: string[]; inner: string[] } {
  const cols: string[] = [];
  const inner: string[] = [];
  for (const node of nodes) {
    if (node.kind === "star") cols.push(`${alias}.*`);
    else if (node.kind === "col") {
      const ref = `${alias}.${ident(node.name)}${node.cast ? `::${node.cast}` : ""}`;
      cols.push(node.alias || node.cast ? `${ref} as ${ident(node.alias ?? node.name)}` : ref);
    } else {
      const childPath = [...path, node.key];
      const rel = resolveRel(scope.meta, table, node.relation, node.hint);
      cols.push(`${embedValue(scope, alias, node, rel, childPath)} as ${ident(node.key)}`);
      if (node.inner) inner.push(embedExists(scope, alias, node, rel, childPath));
    }
  }
  return { cols, inner };
}

/** Only the `exists` conditions of !inner embeds (used for counts, where no columns are selected). */
function innerConds(scope: Scope, table: string, alias: string, nodes: SelectNode[], path: string[]): string[] {
  return nodes
    .filter((n): n is Extract<SelectNode, { kind: "embed" }> => n.kind === "embed" && n.inner)
    .map((n) => embedExists(scope, alias, n, resolveRel(scope.meta, table, n.relation, n.hint), [...path, n.key]));
}

function joinCond(rel: Rel, parentAlias: string, childAlias: string): string {
  const { fk } = rel;
  // many-to-one: parent holds the FK; otherwise the child does
  return fk.columns
    .map((c, i) =>
      rel.type === "many-to-one"
        ? `${childAlias}.${ident(fk.refColumns[i])} = ${parentAlias}.${ident(c)}`
        : `${childAlias}.${ident(c)} = ${parentAlias}.${ident(fk.refColumns[i])}`,
    )
    .join(" and ");
}

function embedValue(scope: Scope, parentAlias: string, node: Extract<SelectNode, { kind: "embed" }>, rel: Rel, path: string[]): string {
  const a = `t${++scope.n.i}`;
  const { cols, inner } = columns(scope, node.relation, a, node.children, path);
  const where = [joinCond(rel, parentAlias, a), ...whereFor(scope, a, path), ...inner].join(" and ");
  const from = `from public.${ident(node.relation)} ${a} where ${where}`;
  if (rel.type === "one-to-many") {
    const lim = scope.limits.get(pathKey(path));
    return `coalesce((select json_agg(_e) from (select ${cols.join(", ")} ${from}${orderFor(scope, a, path)}${lim ? ` limit ${lim}` : ""}) _e), '[]'::json)`;
  }
  return `(select row_to_json(_e) from (select ${cols.join(", ")} ${from} limit 1) _e)`;
}

function embedExists(scope: Scope, parentAlias: string, node: Extract<SelectNode, { kind: "embed" }>, rel: Rel, path: string[]): string {
  const a = `t${++scope.n.i}`;
  // nested !inner embeds must also exist
  const nestedInner: string[] = [];
  for (const child of node.children) {
    if (child.kind === "embed" && child.inner) {
      nestedInner.push(embedExists(scope, a, child, resolveRel(scope.meta, node.relation, child.relation, child.hint), [...path, child.key]));
    }
  }
  const where = [joinCond(rel, parentAlias, a), ...whereFor(scope, a, path), ...nestedInner].join(" and ");
  return `exists (select 1 from public.${ident(node.relation)} ${a} where ${where})`;
}

/* ------------------------------------------------------------------ */
/* Query builder                                                        */
/* ------------------------------------------------------------------ */

type Op = "select" | "insert" | "update" | "upsert" | "delete";
type CountMode = "exact" | "planned" | "estimated";

export class QueryBuilder<T = any[]> implements PromiseLike<DbResult<T>> {
  private op: Op = "select";
  private selectStr: string | null = null;
  private countMode: CountMode | null = null;
  private head = false;
  private filters: Filter[] = [];
  private ors: OrGroup[] = [];
  private orders: Order[] = [];
  private limitN: number | null = null;
  private offsetN: number | null = null;
  private embedLimits = new Map<string, number>();
  private mode: "many" | "single" | "maybe" = "many";
  private values: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private conflict: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(
    private readonly table: string,
    private readonly run: Runner,
  ) {
    ident(table);
  }

  /* ----- shape ----- */
  select(columns = "*", opts: { count?: CountMode; head?: boolean } = {}): this {
    this.selectStr = columns;
    if (opts.count) this.countMode = opts.count;
    if (opts.head) this.head = true;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.op = "insert";
    this.values = values;
    return this;
  }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}): this {
    this.op = "upsert";
    this.values = values;
    this.conflict = opts;
    return this;
  }
  update(values: Record<string, unknown>): this {
    this.op = "update";
    this.values = values;
    return this;
  }
  delete(): this {
    this.op = "delete";
    return this;
  }

  /* ----- filters ----- */
  private add(column: string, op: FilterOp, value: unknown, negate = false): this {
    const { path, column: col } = splitPath(column);
    this.filters.push({ path, column: col, op, value, negate });
    return this;
  }
  eq(c: string, v: unknown) { return this.add(c, "eq", v); }
  neq(c: string, v: unknown) { return this.add(c, "neq", v); }
  gt(c: string, v: unknown) { return this.add(c, "gt", v); }
  gte(c: string, v: unknown) { return this.add(c, "gte", v); }
  lt(c: string, v: unknown) { return this.add(c, "lt", v); }
  lte(c: string, v: unknown) { return this.add(c, "lte", v); }
  like(c: string, v: string) { return this.add(c, "like", v); }
  ilike(c: string, v: string) { return this.add(c, "ilike", v); }
  in(c: string, v: readonly unknown[]) { return this.add(c, "in", [...v]); }
  is(c: string, v: null | boolean) { return this.add(c, "is", v); }
  contains(c: string, v: unknown) { return this.add(c, "cs", v); }
  not(c: string, op: string, v: unknown) { return this.add(c, op as FilterOp, v, true); }
  filter(c: string, op: string, v: unknown) {
    if (op === "in" && typeof v === "string") return this.add(c, "in", v.replace(/^\(|\)$/g, "").split(","));
    return this.add(c, op as FilterOp, v);
  }
  match(obj: Record<string, unknown>) {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v);
    return this;
  }
  or(expr: string, opts: { referencedTable?: string; foreignTable?: string } = {}): this {
    const ref = opts.referencedTable ?? opts.foreignTable;
    const path = ref ? ref.split(".") : [];
    this.ors.push({ path, parts: parseOr(expr, path) });
    return this;
  }

  /* ----- modifiers ----- */
  order(column: string, opts: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string; foreignTable?: string } = {}): this {
    const ref = opts.referencedTable ?? opts.foreignTable;
    const { path, column: col } = ref ? { path: ref.split("."), column } : splitPath(column);
    this.orders.push({ path, column: col, ascending: opts.ascending ?? true, nullsFirst: opts.nullsFirst });
    return this;
  }
  limit(n: number, opts: { referencedTable?: string; foreignTable?: string } = {}): this {
    const ref = opts.referencedTable ?? opts.foreignTable;
    if (ref) this.embedLimits.set(ref, Math.max(0, Math.floor(n)));
    else this.limitN = Math.max(0, Math.floor(n));
    return this;
  }
  range(from: number, to: number): this {
    this.offsetN = Math.max(0, Math.floor(from));
    this.limitN = Math.max(0, Math.floor(to) - Math.floor(from) + 1);
    return this;
  }
  single(): QueryBuilder<any> {
    this.mode = "single";
    return this as unknown as QueryBuilder<any>;
  }
  maybeSingle(): QueryBuilder<any> {
    this.mode = "maybe";
    return this as unknown as QueryBuilder<any>;
  }

  /* ----- execution ----- */
  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute(): Promise<DbResult<T>> {
    try {
      const meta = await getMeta();
      const out = await this.run(async (c) => {
        if (this.op === "select") return this.runSelect(c, meta);
        return this.runMutation(c, meta);
      });
      return this.finish(out.rows, out.count);
    } catch (e) {
      return { data: null, error: toError(e), count: null, status: 400, statusText: "Bad Request" };
    }
  }

  private scope(meta: SchemaMeta, p: Params): Scope {
    return { meta, p, filters: this.filters, ors: this.ors, orders: this.orders, limits: this.embedLimits, n: { i: 0 } };
  }

  private async runSelect(c: PoolClient, meta: SchemaMeta): Promise<{ rows: unknown[] | null; count: number | null }> {
    const tbl = `public.${ident(this.table)}`;
    let count: number | null = null;
    if (this.countMode) {
      const p = new Params();
      const scope = this.scope(meta, p);
      const inner = innerConds(scope, this.table, "t0", parseSelect(this.selectStr ?? "*"), []);
      const where = [...whereFor(scope, "t0", []), ...inner];
      const r = await c.query(`select count(*)::int as c from ${tbl} t0${where.length ? ` where ${where.join(" and ")}` : ""}`, p.values);
      count = r.rows[0].c as number;
      if (this.head) return { rows: null, count };
    }
    const p = new Params();
    const scope = this.scope(meta, p);
    const { cols, inner } = columns(scope, this.table, "t0", parseSelect(this.selectStr ?? "*"), []);
    const where = [...whereFor(scope, "t0", []), ...inner];
    const sql =
      `select coalesce(json_agg(_r), '[]'::json) as data from (select ${cols.join(", ")} from ${tbl} t0` +
      (where.length ? ` where ${where.join(" and ")}` : "") +
      orderFor(scope, "t0", []) +
      (this.limitN !== null ? ` limit ${this.limitN}` : "") +
      (this.offsetN !== null ? ` offset ${this.offsetN}` : "") +
      `) _r`;
    const r = await c.query(sql, p.values);
    return { rows: r.rows[0].data as unknown[], count };
  }

  private async runMutation(c: PoolClient, meta: SchemaMeta): Promise<{ rows: unknown[] | null; count: number | null }> {
    const tbl = `public.${ident(this.table)}`;
    const p = new Params();
    const scope = this.scope(meta, p);
    const returning = this.selectStr !== null;
    let core: string;

    if (this.op === "insert" || this.op === "upsert") {
      const rows = (Array.isArray(this.values) ? this.values : [this.values ?? {}]).map((r) =>
        Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)),
      );
      if (!rows.length) return { rows: returning ? [] : null, count: null };
      const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      const colList = keys.map(ident).join(", ");
      core = `insert into ${tbl} as t0 (${colList}) select ${colList} from json_populate_recordset(null::${tbl}, ${p.add(JSON.stringify(rows))}::json)`;
      if (this.op === "upsert") {
        const target = this.conflict.onConflict ? this.conflict.onConflict.split(",").map((x) => x.trim()) : (meta.pks.get(this.table) ?? []);
        if (!target.length) throw new Error(`upsert on ${this.table} needs onConflict`);
        const updatable = keys.filter((k) => !target.includes(k));
        core +=
          ` on conflict (${target.map(ident).join(", ")}) ` +
          (this.conflict.ignoreDuplicates || !updatable.length ? "do nothing" : `do update set ${updatable.map((k) => `${ident(k)} = excluded.${ident(k)}`).join(", ")}`);
      }
    } else if (this.op === "update") {
      const vals = Object.fromEntries(Object.entries(this.values ?? {}).filter(([, v]) => v !== undefined));
      const keys = Object.keys(vals);
      if (!keys.length) throw new Error("update() needs at least one column");
      const where = whereFor(scope, "t0", []);
      core =
        `update ${tbl} as t0 set ${keys.map((k) => `${ident(k)} = _v.${ident(k)}`).join(", ")} ` +
        `from json_populate_record(null::${tbl}, ${p.add(JSON.stringify(vals))}::json) _v` +
        (where.length ? ` where ${where.join(" and ")}` : "");
    } else {
      const where = whereFor(scope, "t0", []);
      core = `delete from ${tbl} as t0` + (where.length ? ` where ${where.join(" and ")}` : "");
    }

    if (!returning) {
      await c.query(core, p.values);
      return { rows: null, count: null };
    }
    // Re-shape returned rows with the requested select (embeds join from the new rows)
    const s2 = { ...scope, filters: [], ors: [], orders: [] as Order[] };
    const { cols } = columns(s2, this.table, "t0", parseSelect(this.selectStr ?? "*"), []);
    const r = await c.query(`with _m as (${core} returning t0.*) select coalesce(json_agg(_r), '[]'::json) as data from (select ${cols.join(", ")} from _m t0) _r`, p.values);
    return { rows: r.rows[0].data as unknown[], count: null };
  }

  private finish(rows: unknown[] | null, count: number | null): DbResult<T> {
    const ok = (data: unknown): DbResult<T> => ({ data: data as T, error: null, count, status: 200, statusText: "OK" });
    if (rows === null) return ok(null);
    if (this.mode === "many") return ok(rows);
    if (rows.length > 1 || (this.mode === "single" && rows.length === 0)) {
      return {
        data: null,
        error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116", details: `The result contains ${rows.length} rows`, hint: null },
        count,
        status: 406,
        statusText: "Not Acceptable",
      };
    }
    return ok(rows[0] ?? null);
  }
}

/* ------------------------------------------------------------------ */
/* RPC                                                                  */
/* ------------------------------------------------------------------ */

export class RpcBuilder<T = any> implements PromiseLike<DbResult<T>> {
  private mode: "many" | "single" | "maybe" = "many";
  constructor(
    private readonly fn: string,
    private readonly args: Record<string, unknown>,
    private readonly run: Runner,
  ) {
    ident(fn);
  }
  single(): this {
    this.mode = "single";
    return this;
  }
  maybeSingle(): this {
    this.mode = "maybe";
    return this;
  }
  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }
  async execute(): Promise<DbResult<T>> {
    try {
      const meta = await getMeta();
      const info = meta.functions.get(this.fn) ?? { returnsSet: false, returnsRow: false, returnsVoid: false };
      const p = new Params();
      const named = Object.entries(this.args)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${ident(k)} => ${p.add(v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v)}`)
        .join(", ");
      const call = `public.${ident(this.fn)}(${named})`;
      const sql = info.returnsSet
        ? `select coalesce(json_agg(_r), '[]'::json) as data from ${call} _r`
        : info.returnsRow
          ? `select row_to_json(_r) as data from ${call} _r`
          : info.returnsVoid
            ? `select ${call}, null::json as data`
            : `select to_json(${call}) as data`;
      const data = await this.run(async (c) => (await c.query(sql, p.values)).rows[0]?.data ?? null);
      if (this.mode !== "many" && Array.isArray(data)) {
        if (data.length > 1 || (this.mode === "single" && !data.length)) {
          return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116", details: null, hint: null }, count: null, status: 406, statusText: "Not Acceptable" };
        }
        return { data: (data[0] ?? null) as T, error: null, count: null, status: 200, statusText: "OK" };
      }
      return { data: data as T, error: null, count: null, status: 200, statusText: "OK" };
    } catch (e) {
      return { data: null, error: toError(e), count: null, status: 400, statusText: "Bad Request" };
    }
  }
}
