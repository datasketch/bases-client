/**
 * Bases Client Type Definitions
 * 
 * Type definitions for the Bases client configuration and operations
 */

export interface Config {
  // Required: org, db for authentication
  org: string;
  db: string;
  // Optional: initial table
  tbl?: string;

  // Allow other fields for backward compatibility
  [key: string]: any;
}

export interface Field {
  id: string;
  label: string;
  type?: string;
  [key: string]: any;
}

export interface getRecordsProps {
  mapValues?: boolean;
  [key: string]: any;
}

export interface getRecordProps {
  id: string;
  mapValues?: boolean;
  [key: string]: any;
}

