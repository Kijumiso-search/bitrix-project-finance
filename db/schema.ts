import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }), bitrixId: text("bitrix_id"), name: text("name").notNull(),
  email: text("email"), createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("idx_employees_bitrix_id").on(table.bitrixId)]);

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), client: text("client").notNull().default(""),
  status: text("status", { enum: ["active", "paused", "completed"] }).notNull().default("active"), createdAt: integer("created_at").notNull(),
});

export const projectEmployees = sqliteTable("project_employees", {
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.projectId, table.employeeId] }), index("idx_project_employees_project_id").on(table.projectId)]);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(),
  kind: text("kind", { enum: ["income", "expense"] }).notNull(), systemKey: text("system_key"), createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("idx_categories_kind_name").on(table.kind, table.name), uniqueIndex("idx_categories_system_key").on(table.systemKey)]);

export const financeEntries = sqliteTable("finance_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }), projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id), amountKopecks: integer("amount_kopecks").notNull(),
  operationDate: text("operation_date").notNull(), comment: text("comment").notNull().default(""),
  authorName: text("author_name").notNull().default("Сотрудник"), createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_finance_entries_project_date").on(table.projectId, table.operationDate)]);
