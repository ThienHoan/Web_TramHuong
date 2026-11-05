// Minimal read-only emulation of supabase-js `from(table).select().eq().in().limit()
// .abortSignal()` over PGlite for fixtures. Only allowlisted tables and columns.
function pgFrom(db, allowed) {
  return table => {
    const columns = allowed[table];
    if (!columns) throw new Error('FIXTURE_TABLE_FORBIDDEN');
    const where = [], params = [];
    let cols = '*', limit = 1000;
    const ident = c => {
      if (!columns.includes(c)) throw new Error('FIXTURE_COLUMN_FORBIDDEN');
      return c;
    };
    const run = () => db.query(
      `SELECT ${cols} FROM public.${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''} LIMIT ${limit}`, params)
      .then(r => ({
        data: r.rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) =>
          [k, v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'bigint' ? Number(v) : v]))),
        error: null,
      }), e => ({data: null, error: {code: e.code, message: 'Fixture rejected'}}));
    const builder = {
      select(list) {cols = list.split(',').map(c => ident(c.trim())).join(','); return builder;},
      eq(c, v) {params.push(v); where.push(`${ident(c)}::text = $${params.length}`); return builder;},
      in(c, vs) {params.push(vs); where.push(`${ident(c)}::text = ANY($${params.length}::text[])`); return builder;},
      limit(n) {limit = Math.min(Number(n) || 0, 1000); return builder;},
      abortSignal() {return run();},
      then(resolve, reject) {return run().then(resolve, reject);},
    };
    return builder;
  };
}
module.exports = {pgFrom};
