import type { DB } from '@';
import { and, eq, getColumns, sql } from 'drizzle-orm';
import * as drizzler from 'drizzle-orm/sql/expressions/conditions';
import { db, tablez } from './client';

const condition = <T extends DB.Tablekey>(name: T, where: DB.Options<T>['where'] = {}) => {
  const source = tablez[name as DB.Tablekey];
  const columns = getColumns(source);

  const conditions = Object.keys(where).map(k => {
    const key = k as keyof typeof columns & keyof typeof where;
    const column = columns[key];
    const option = where[key];
    if (!Array.isArray(option)) return eq(column, option); // Plain value: defaults to eq

    const [operation, ...args] = option;
    const op = drizzler[operation] as Function;
    return (
      !args?.length ? op(column)
      : args.length === 1 ? op(column, args[0])
      : op(column, args[0], args[1])
    );
  });
  return { source, columns, conditions };
};
const getter = async <T extends DB.Tablekey>(name: T, { where, ...opts }: DB.Options<T>) => {
  const { source, columns, conditions } = condition(name, where);

  // Build and execute query
  const normalizer = (thing?: keyof DB.Infertable[T] | DB.Colmnuilder[]) =>
    thing ?
      Array.isArray(thing) ?
        thing
      : [columns[thing as keyof typeof columns]]
    : [];

  const query = await db
    .select(opts.select ?? columns)
    .from(source)
    .where(drizzler[opts.operato || 'and'](...conditions))
    .groupBy(...normalizer(opts.groupBy))
    .orderBy(...normalizer(opts.orderBy))
    .limit(opts.limit || 999666333)
    .offset(opts.offset || 0);

  return query && query.length ? query : undefined;
};

// Generic factory function to create typed getters
export const $get =
  <T extends DB.Tablekey>(table: T) =>
  async <meta = unknown>(opts: DB.Options<T> = {}) => {
    const result = await getter(table, opts);
    return result ? (result as DB.Metabled<T, meta>[]) : [];
  };

export const $select =
  <T extends DB.Tablekey>(table: T) =>
  <S extends Record<string, DB.Colmnuilder>>(select: S) =>
  (opts: Omit<DB.Options<T>, 'select'> = {}) => {
    const result = getter(table, { ...opts, select });
    return result as Promise<DB.Selectuilder<S>[]>;
  };

export const $insert =
  <T extends DB.Tablekey>(table: T) =>
  (data: DB.Infertable<'Insert'>[T] | DB.Infertable<'Insert'>[T][]) =>
    db
      .insert(tablez[table])
      .values(data as any)
      .returning() as Promise<DB.Infertable[T][]>;

export const $update =
  <T extends DB.Tablekey>(table: T) =>
  <meta = unknown>(where: NonNullable<DB.Options<T>['where']>) =>
  async (data: Partial<DB.Infertable<'Insert'>[T]>) => {
    const { source, conditions } = condition(table, where);
    const query = db
      .update(source)
      .set({
        updatedAt: new Date(),
        ...data
        // ...('meta' in data &&
        //   'meta' in source &&
        //   data.meta !== undefined && {
        //     meta:
        //       data.meta === null ? null : sql`COALESCE(${source.meta}, '{}'::jsonb) || ${JSON.stringify(data.meta)}::jsonb`
        //   })
      })
      .where(and(...conditions))
      .returning();
    return query as unknown as Promise<DB.Metabled<T, meta>[]>; // Type assertion to include meta
  };

export const $delete =
  <T extends DB.Tablekey>(table: T) =>
  (opts: DB.Options<T>) => {
    const { source, conditions } = condition(table, opts.where);
    return db
      .delete(source)
      .where(and(...conditions))
      .execute();
  };
