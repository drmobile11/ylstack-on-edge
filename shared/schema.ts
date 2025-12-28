import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === CORE MONOREPO SCHEMA (Foundation) ===

// Helper for UUIDs in SQLite
const uuid = (name: string) => text(name).$defaultFn(() => crypto.randomUUID());
// Helper for Timestamps in SQLite
const timestamp = (name: string) => text(name).default(new Date().toISOString());
// Helper for boolean in SQLite
const boolean = (name: string) => integer(name, { mode: "boolean" });

// Tenants (Multi-tenancy root)
export const tenants = sqliteTable("tenants", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"), // active, suspended
  config: text("config", { mode: "json" }).$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Users (Role-aware)
export const users = sqliteTable("users", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  parentUserId: text("parent_user_id").references((): any => users.id), // Sub-user hierarchy
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  username: text("username"),
  country: text("country"),
  role: text("role").notNull().default("customer"), // super_admin, admin, distributor, reseller, web_owner, customer
  status: text("status").notNull().default("active"), // active, disabled, banned, warned
  statusReason: text("status_reason"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// API Keys (Machine access)
export const apiKeys = sqliteTable("api_keys", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  scopes: text("scopes", { mode: "json" }).$type<string[]>().default([]),
  allowedDomains: text("allowed_domains", { mode: "json" }).$type<string[]>().default([]),
  lastUsedAt: text("last_used_at"),
  expiresAt: text("expires_at"),
  createdAt: timestamp("created_at"),
});

// Audit Logs (Security requirement)
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  actorId: text("actor_id"),
  actorType: text("actor_type"), // user, api_key
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  metadata: text("metadata", { mode: "json" }),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at"),
});

// === GSMFLOW PLATFORM SCHEMA ===

// Wallets (No direct balance - computed from transactions)
export const wallets = sqliteTable("wallets", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Transactions (Ledger - source of truth for balances)
export const transactions = sqliteTable("transactions", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  walletId: text("wallet_id").references(() => wallets.id).notNull(),
  type: text("type").notNull(), // credit, debit, lock, unlock, refund
  amount: integer("amount").notNull(), // Store as cents/smallest unit
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"), // pending, completed, failed, reversed
  referenceType: text("reference_type"), // order, invoice, payment, manual
  referenceId: text("reference_id"),
  parentTransactionId: text("parent_transaction_id").references((): any => transactions.id),
  description: text("description"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at"),
  completedAt: text("completed_at"),
});

// Providers (Plugin system)
export const providers = sqliteTable("providers", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type").notNull(), // manual, api, async_api, webhook, file_based
  isActive: boolean("is_active").notNull().default(true),
  config: text("config", { mode: "json" }).$type<Record<string, any>>().default({}),
  credentials: text("credentials", { mode: "json" }).$type<Record<string, any>>().default({}),
  statusMapping: text("status_mapping", { mode: "json" }).$type<Record<string, string>>().default({}),
  lastSyncAt: text("last_sync_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Service Groups
export const serviceGroups = sqliteTable("service_groups", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Services (Dynamic schema)
export const services = sqliteTable("services", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  groupId: text("group_id").references(() => serviceGroups.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  inputSchema: text("input_schema", { mode: "json" }).$type<Record<string, any>>().notNull(), // Dynamic form fields
  validationRules: text("validation_rules", { mode: "json" }).$type<Record<string, any>>().default({}),
  baseCost: integer("base_cost").notNull(), // In cents
  currency: text("currency").notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  allowedRoles: text("allowed_roles", { mode: "json" }).$type<string[]>().default([]),
  supportsBulk: boolean("supports_bulk").notNull().default(false),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Provider-Service Mapping
export const providerServiceMappings = sqliteTable("provider_service_mappings", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  serviceId: text("service_id").references(() => services.id).notNull(),
  providerId: text("provider_id").references(() => providers.id).notNull(),
  providerServiceId: text("provider_service_id").notNull(), // External provider's service ID
  priority: integer("priority").default(0),
  isActive: boolean("is_active").notNull().default(true),
  config: text("config", { mode: "json" }).$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at"),
});

// Pricing Rules (Role-based)
export const pricingRules = sqliteTable("pricing_rules", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  serviceId: text("service_id").references(() => services.id).notNull(),
  role: text("role").notNull(),
  markupType: text("markup_type").notNull(), // fixed, percentage, tiered
  markupValue: integer("markup_value").notNull(),
  minProfit: integer("min_profit"),
  maxProfit: integer("max_profit"),
  tierConfig: text("tier_config", { mode: "json" }).$type<Record<string, any>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Orders
export const orders = sqliteTable("orders", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  serviceId: text("service_id").references(() => services.id).notNull(),
  providerId: text("provider_id").references(() => providers.id),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, payment_confirmed, approved, processing, delivered, failed, refunded, cancelled
  inputData: text("input_data", { mode: "json" }).$type<Record<string, any>>().notNull(),
  outputData: text("output_data", { mode: "json" }).$type<Record<string, any>>(),
  baseCost: integer("base_cost").notNull(),
  markup: integer("markup").notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").default(0),
  currency: text("currency").notNull().default("USD"),
  providerOrderId: text("provider_order_id"),
  providerStatus: text("provider_status"),
  providerResponse: text("provider_response", { mode: "json" }).$type<Record<string, any>>(),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  completedAt: text("completed_at"),
});

// Order Items (for bulk orders)
export const orderItems = sqliteTable("order_items", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  inputData: text("input_data", { mode: "json" }).$type<Record<string, any>>().notNull(),
  outputData: text("output_data", { mode: "json" }).$type<Record<string, any>>(),
  status: text("status").notNull().default("pending"),
  providerOrderId: text("provider_order_id"),
  providerStatus: text("provider_status"),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Invoices
export const invoices = sqliteTable("invoices", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull().default("draft"), // draft, issued, paid, cancelled
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").default(0),
  total: integer("total").notNull(),
  currency: text("currency").notNull().default("USD"),
  dueDate: text("due_date"),
  paidAt: text("paid_at"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Payment Methods (Plugin system)
export const paymentMethods = sqliteTable("payment_methods", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // wallet, stripe, paypal, bank_transfer, custom
  isActive: boolean("is_active").notNull().default(true),
  config: text("config", { mode: "json" }).$type<Record<string, any>>().default({}),
  feeType: text("fee_type"), // fixed, percentage
  feeValue: integer("fee_value"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Webhooks
export const webhooks = sqliteTable("webhooks", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  url: text("url").notNull(),
  events: text("events", { mode: "json" }).$type<string[]>().notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  lastTriggeredAt: text("last_triggered_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  parentUser: one(users, {
    fields: [users.parentUserId],
    references: [users.id],
  }),
  subUsers: many(users),
  wallets: many(wallets),
  orders: many(orders),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [wallets.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id],
  }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  parentTransaction: one(transactions, {
    fields: [transactions.parentTransactionId],
    references: [transactions.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [services.tenantId],
    references: [tenants.id],
  }),
  group: one(serviceGroups, {
    fields: [services.groupId],
    references: [serviceGroups.id],
  }),
  providerMappings: many(providerServiceMappings),
  pricingRules: many(pricingRules),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [orders.serviceId],
    references: [services.id],
  }),
  provider: one(providers, {
    fields: [orders.providerId],
    references: [providers.id],
  }),
  items: many(orderItems),
}));

// Schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, lastUsedAt: true, createdAt: true });
export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true, completedAt: true });
export const insertProviderSchema = createInsertSchema(providers).omit({ id: true, createdAt: true, updatedAt: true, lastSyncAt: true });
export const insertServiceGroupSchema = createInsertSchema(serviceGroups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPricingRuleSchema = createInsertSchema(pricingRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type ServiceGroup = typeof serviceGroups.$inferSelect;
export type InsertServiceGroup = z.infer<typeof insertServiceGroupSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
