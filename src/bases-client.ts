import 'cross-fetch/polyfill';

import { AuthenticationError, BasesClientError } from "./errors";
import { Config, Field, getRecordProps, getRecordsProps } from './types';

export default class BasesClient {
  #config: Config;
  #currentTable: string | null = null;
  #authToken: string | null = null;
  #baseUrl: string;
  #authUrl: string;

  constructor(config: Config) {
    const { tbl, ...restConfig } = config;
    this.#config = restConfig;

    // Base URL para consultas a la API
    this.#baseUrl = "https://hddb-service.fly.dev";
    

    // Auth URL (si es diferente, por defecto usa baseUrl)
    this.#authUrl = this.#baseUrl;

    if (tbl) {
      this.#currentTable = tbl;
    }
  }

  async setTable(tbl: string): Promise<void> {
    if (this.#currentTable !== tbl) {
      this.#currentTable = tbl;
      // Invalida el token al cambiar la tabla
      this.#authToken = null;
      await this.#authenticate();
    }
  }

  /**
   * Autenticación con el nuevo endpoint
   * POST /auth/generate
   */
  async #authenticate(): Promise<void> {
    if (!this.#currentTable) {
      throw new Error("Table not set. Call setTable() before making any requests.");
    }

    try {
      const response = await fetch(`${this.#authUrl}/auth/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...this.#config,
          tbl: this.#currentTable,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError("Invalid credentials provided");
        } else if (response.status === 400) {
          const errorData = await response.json().catch(() => ({})) as { data?: { message?: string } };
          throw new AuthenticationError(
            errorData.data?.message || "Invalid request"
          );
        } else {
          throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json() as { data: string };
      const authToken = data.data;

      if (!authToken) {
        throw new AuthenticationError("Auth token not provided in response");
      }

      this.#authToken = authToken;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof BasesClientError) {
        throw error;
      } else {
        throw new BasesClientError(
          `Failed to authenticate: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  async #fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.#currentTable) {
      throw new Error("Table not set. Call setTable() before making any requests.");
    }
    if (!this.#authToken) {
      await this.#authenticate();
    }

    const url = new URL(endpoint, this.#baseUrl);
    return fetch(url.toString(), {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${this.#authToken}`,
      },
    });
  }

  // -----------------------------
  // Métodos de la API
  // -----------------------------

  async getRecords<T>(props?: getRecordsProps): Promise<{ data: T[], fields: Field[] }> {
    const { mapValues = true } = props || {};
    const response = await this.#fetch("tables/data");
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { fields: Field[], data: any[] };
    if (!mapValues) return data as { data: T[], fields: Field[] };

    const { fields, data: records } = data;
    if (!fields || !Array.isArray(fields) || !records || !Array.isArray(records)) {
      throw new BasesClientError("Invalid response structure: expected data and fields arrays");
    }

    const fieldMap = fields.reduce((acc: Record<string, string>, field: any) => {
      if (field?.id && field?.label) acc[field.id] = field.label;
      return acc;
    }, {});

    const mappedRecords = records.map((record: any) => {
      const mappedRecord: Record<string, any> = {};
      Object.keys(record).forEach((key) => {
        mappedRecord[fieldMap[key] || key] = record[key];
      });
      return mappedRecord as T;
    });

    return { data: mappedRecords, fields };
  }

  async getRecord<T>(props: getRecordProps): Promise<{ data: T | null, fields: Field[] | null }> {
    const { id, mapValues = true } = props || {};
    const response = await this.#fetch(`tables/rows/get?id=${id}`);
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: any | null, fields: Field[] | null };
    if (!mapValues) return data as { data: T | null, fields: Field[] | null };

    const { data: record, fields } = data;
    if (record === null) return data as { data: T | null, fields: Field[] | null };

    if (!fields || !Array.isArray(fields)) {
      throw new BasesClientError("Invalid response structure: expected fields array");
    }

    const fieldMap = fields.reduce((acc: Record<string, string>, field: any) => {
      if (field?.id && field?.label) acc[field.id] = field.label;
      return acc;
    }, {});

    const mappedRecord = Object.keys(record).reduce((acc: T, key) => {
      (acc as any)[fieldMap[key] || key] = record[key];
      return acc;
    }, {} as T);

    return { data: mappedRecord, fields };
  }

  async getFields<T>(): Promise<Field[]> {
    const response = await this.#fetch("tables/fields");
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<Field[]>;
  }

  async updateRecord<T>(id: string, data: T): Promise<{ success: boolean }> {
    const response = await this.#fetch(`tables/rows/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async updateRecords<T>(data: T[]) {
    const response = await this.#fetch('tables/rows/update-many', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async insertRecord<T>(data: T): Promise<{ success: boolean }> {
    const response = await this.#fetch("tables/rows/insert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async insertRecords<T>(data: T[]): Promise<{ success: boolean }> {
    const response = await this.#fetch("tables/upload-bulk-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async deleteRecord(id: string): Promise<{ success: boolean }> {
    const response = await this.#fetch(`tables/rows/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async createView(id: string, table: string, type: string, config: object) {
    const response = await this.#fetch("tables/viz/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { id, table, type, config } }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async updateView(id: string, config: object) {
    const response = await this.#fetch("tables/viz/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { id, config } }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async deleteView(id: string) {
    const response = await this.#fetch("tables/viz/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { id } }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }

  async getView(id: string) {
    const response = await this.#fetch("tables/viz/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { id } }),
    });
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const success = await response.json() as { success: boolean };
    return { success: success.success };
  }
}
