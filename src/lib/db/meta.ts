import "server-only";
import { getPool } from "./pool";

export interface ForeignKey {
  name: string;
  table: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
}

export interface FunctionMeta {
  returnsSet: boolean;
  /** composite / table-returning → rows are objects */
  returnsRow: boolean;
  returnsVoid: boolean;
}

export interface SchemaMeta {
  fks: ForeignKey[];
  /** table → list of unique column sets (PK + unique constraints) */
  uniques: Map<string, string[][]>;
  /** table → primary-key columns */
  pks: Map<string, string[]>;
  functions: Map<string, FunctionMeta>;
}

let cached: Promise<SchemaMeta> | null = null;

/** Public-schema relationship & function metadata, loaded once per server instance. */
export function getMeta(): Promise<SchemaMeta> {
  if (!cached) {
    cached = load().catch((e) => {
      cached = null; // retry on the next call rather than caching a failure
      throw e;
    });
  }
  return cached;
}

async function load(): Promise<SchemaMeta> {
  const pool = getPool();
  const [fk, uq, fn] = await Promise.all([
    pool.query<{ name: string; tbl: string; cols: string[]; ftbl: string; fcols: string[] }>(`
      select con.conname as name, cl.relname as tbl, fcl.relname as ftbl,
             array_agg(a.attname::text order by k.ord) as cols,
             array_agg(fa.attname::text order by k.ord) as fcols
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join pg_class fcl on fcl.oid = con.confrelid
      join pg_namespace fn on fn.oid = fcl.relnamespace
      cross join lateral unnest(con.conkey, con.confkey) with ordinality as k(attnum, fattnum, ord)
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
      join pg_attribute fa on fa.attrelid = con.confrelid and fa.attnum = k.fattnum
      where con.contype = 'f' and n.nspname = 'public' and fn.nspname = 'public'
      group by con.conname, cl.relname, fcl.relname`),
    pool.query<{ tbl: string; contype: string; cols: string[] }>(`
      select cl.relname as tbl, con.contype::text as contype,
             array_agg(a.attname::text order by k.ord) as cols
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      cross join lateral unnest(con.conkey) with ordinality as k(attnum, ord)
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
      where con.contype in ('p', 'u') and n.nspname = 'public'
      group by con.oid, cl.relname, con.contype`),
    pool.query<{ name: string; retset: boolean; typtype: string; typname: string; has_table_args: boolean }>(`
      select p.proname as name, p.proretset as retset, t.typtype::text as typtype, t.typname as typname,
             coalesce('t' = any(p.proargmodes::text[]), false) as has_table_args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_type t on t.oid = p.prorettype
      where n.nspname = 'public'`),
  ]);

  const uniques = new Map<string, string[][]>();
  const pks = new Map<string, string[]>();
  for (const r of uq.rows) {
    uniques.set(r.tbl, [...(uniques.get(r.tbl) ?? []), r.cols]);
    if (r.contype === "p") pks.set(r.tbl, r.cols);
  }
  const functions = new Map<string, FunctionMeta>();
  for (const r of fn.rows) {
    functions.set(r.name, {
      returnsSet: r.retset,
      returnsRow: r.typtype === "c" || r.has_table_args || r.typname === "record",
      returnsVoid: r.typname === "void",
    });
  }
  return {
    fks: fk.rows.map((r) => ({ name: r.name, table: r.tbl, columns: r.cols, refTable: r.ftbl, refColumns: r.fcols })),
    uniques,
    pks,
    functions,
  };
}
