import * as safety from "../../../lib/universal/safety.ts";
import * as emit from "../../emit/mod.ts";

export interface SqlTriggerDefinition<
  TriggerName extends string,
  Context extends emit.SqlEmitContext,
> extends emit.SqlTextSupplier<Context> {
  readonly triggerName: TriggerName;
}

export function isSqlTriggerDefinition<
  TriggerName extends string,
  Context extends emit.SqlEmitContext,
>(
  o: unknown,
): o is SqlTriggerDefinition<TriggerName, Context> {
  const isTriggerDefn = safety.typeGuard<
    SqlTriggerDefinition<TriggerName, Context>
  >("triggerName", "SQL");
  return isTriggerDefn(o);
}

export interface SqlTriggerDefnOptions<
  TypeName extends string,
  Context extends emit.SqlEmitContext,
> extends emit.SqlTextSupplierOptions<Context> {
  readonly embeddedStsOptions: emit.SqlTextSupplierOptions<Context>;
  readonly before?: (
    viewName: TypeName,
    vdOptions: SqlTriggerDefnOptions<TypeName, Context>,
  ) => emit.SqlTextSupplier<Context>;
  readonly sqlNS?: emit.SqlNamespaceSupplier;
}

export function sqlTriggerDefinition<
  TriggerName extends string,
  Context extends emit.SqlEmitContext,
>(
  triggerName: TriggerName,
  table: string,
  when: "BEFORE" | "AFTER" | "INSTEAD OF",
  events: string | string[],
  action: string,
  stdOptions?: SqlTriggerDefnOptions<TriggerName, Context>,
) {
  const triggerDefn: SqlTriggerDefinition<TriggerName, Context> = {
    triggerName,
    SQL: (ctx) => {
      const { sqlTextEmitOptions: steOptions } = ctx;
      const ns = ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true });
      const ctfi = steOptions.indentation("create trigger");
      const event = Array.isArray(events) ? events.join(" OR ") : events;
      const create = steOptions.indentation(
        "create trigger",
        `${ctfi}CREATE TRIGGER ${
          ns.triggerName(triggerName)
        }\n${ctfi}${when} ${event} ON ${
          ns.tableName(table)
        }\n${ctfi}FOR EACH ROW\n${ctfi}${action}`,
      );
      return stdOptions?.before
        ? ctx.embeddedSQL<Context>(stdOptions.embeddedStsOptions)`${[
          stdOptions.before(triggerName, stdOptions),
          create,
        ]}`.SQL(ctx)
        : create;
    },
  };
  return {
    ...triggerDefn,
    drop: (options?: { ifExists?: boolean }) =>
      dropTrigger(triggerName, options),
    sqlNS: stdOptions?.sqlNS,
  };
}

export function dropTrigger<
  TriggerName extends string,
  Context extends emit.SqlEmitContext,
>(
  triggerName: TriggerName,
  options?: { ifExists?: boolean },
): emit.SqlTextSupplier<Context> {
  const { ifExists = true } = options ?? {};
  return {
    SQL: (ctx) => {
      const ns = ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true });
      return `DROP TRIGGER ${ifExists ? "IF EXISTS " : ""}${
        ns.triggerName(triggerName)
      }`;
    },
  };
}
