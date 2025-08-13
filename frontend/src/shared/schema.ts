import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  fritzingId: text("fritzing_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  tags: text("tags").array(),
  iconUrl: text("icon_url"),
  breadboardUrl: text("breadboard_url"),
  connectors: jsonb("connectors"),
  properties: jsonb("properties"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  canvas: jsonb("canvas"), // stores component positions and wire connections
});

export const placedComponents = pgTable("placed_components", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  componentId: integer("component_id").references(() => components.id),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  rotation: integer("rotation").default(0),
  properties: jsonb("properties"),
});

export const wires = pgTable("wires", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  startComponentId: integer("start_component_id").references(() => placedComponents.id),
  startPinId: text("start_pin_id").notNull(),
  endComponentId: integer("end_component_id").references(() => placedComponents.id),
  endPinId: text("end_pin_id").notNull(),
  path: jsonb("path"), // array of {x, y} points for wire routing
  color: text("color").default("black"),
});

export const insertComponentSchema = createInsertSchema(components).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export const insertPlacedComponentSchema = createInsertSchema(placedComponents).omit({ id: true });
export const insertWireSchema = createInsertSchema(wires).omit({ id: true });

export type Component = typeof components.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type PlacedComponent = typeof placedComponents.$inferSelect;
export type Wire = typeof wires.$inferSelect;

export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertPlacedComponent = z.infer<typeof insertPlacedComponentSchema>;
export type InsertWire = z.infer<typeof insertWireSchema>;

export interface FritzingConnector {
  id: string;
  name: string;
  description?: string;
  type: string;
  x: number;
  y: number;
}

export interface CanvasState {
  components: Array<{
    id: string;
    componentId: number;
    x: number;
    y: number;
    rotation: number;
    properties?: Record<string, any>;
  }>;
  wires: Array<{
    id: string;
    startComponent: string;
    startPin: string;
    endComponent: string;
    endPin: string;
    path: Array<{ x: number; y: number }>;
    color: string;
  }>;
}
