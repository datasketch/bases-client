import 'cross-fetch/polyfill';
import { AuthenticationError, BasesClientError } from "./errors";
import { Config, Field, getRecordProps, getRecordsProps } from './types';


export default class BasesClient {
  #config: Config;
  #currentTable: string | null = null;
  #authToken: string | null = null;
  #baseUrl = "https://bases.datasketch.co";

  constructor(config: Config) {
    const { tbl, ...restConfig } = config;
    this.#config = restConfig;
    if (tbl) {
      this.#currentTable = tbl;
    }
  }

  async setTable(tbl: string): Promise<void> {
    if (this.#currentTable !== tbl) {
      this.#currentTable = tbl;
      this.#authToken = null;
      await this.#authenticate();
    }
  }

  async #authenticate(): Promise<void> {
    if (!this.#currentTable) {
      throw new Error(
        "Table not set. Call setTable() before making any requests."
      );
    }

    try {
      const response = await fetch("https://api.datasketch.co/v1/auth/bases", {
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
        } else {
          throw new BasesClientError(
            `HTTP error: ${response.status} ${response.statusText}`
          );
        }
      }

      const data = await response.json();
      const authToken = data.data;

      if (!authToken) {
        throw new AuthenticationError("Auth token not provided in response");
      }

      this.#authToken = authToken;
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof BasesClientError
      ) {
        throw error;
      } else {
        throw new BasesClientError(
          `Failed to authenticate: ${error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  async #fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.#currentTable) {
      throw new Error(
        "Table not set. Call setTable() before making any requests."
      );
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


  async getRecords<T>(props: getRecordsProps): Promise<{ data: T[], fields: Field[] }> {
    const { mapValues = true } = props || {};
    const response = await this.#fetch("tables/data")
    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }
    
    const data = await response.json()
    if (!mapValues) {
      return data
    }
    
    const { fields, data: records } = data
    const fieldMap = fields.reduce((acc: Record<string, string>, field: any) => {
      acc[field.id] = field.label;
      return acc;
    }, {});

    const mappedRecords = records.map((record: any) => {
      const mappedRecord: Record<string, any> = {};
      Object.keys(record).forEach((key) => {
        if (fieldMap[key]) {
          mappedRecord[fieldMap[key]] = record[key];
        } else {
          mappedRecord[key] = record[key];
        }
      });
      return mappedRecord as T;
    });

    return { data: mappedRecords, fields };

  }

  async getRecord<T>(props: getRecordProps): Promise<{ data: T | null, fields: Field[] | null }> {
    const { id, mapValues = true } = props || {};
    const response = await this.#fetch(
      `tables/rows/get?id=${id}`
    );

    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json()
    if (!mapValues) {
      return data
    }
    const { data: record, fields } = data
    if (record === null) {
      return data
    }

    const fieldMap = fields?.reduce((acc: Record<string, string>, field: any) => {
      acc[field.id] = field.label;
      return acc;
    }, {});

    const mappedRecord = Object.keys(record).reduce((acc: T, key) => {
      if (fieldMap[key]) {
        acc[fieldMap[key] as keyof T] = record[key];
      } else {
        acc[key as keyof T] = record[key];
      }
      return acc;
    }, {} as T);

    return { data: mappedRecord, fields }

  }

  async getFields<T>(): Promise<Field[]> {
    const response = await this.#fetch("tables/fields")
    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }
    return response.json()
  }

  async updateRecord<T>(id: string, data: T): Promise<{ success: boolean }> {
    const response = await this.#fetch(`tables/rows/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, data }),
    });

    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }
    const success = await response.json()
    return { success };
  }

  async updateRecords<T>(data: T[]) {
    const response = await this.#fetch('tables/rows/update-many', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data })
    })
    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }
    const success = await response.json()
    return { success };
  }

  async insertRecord<T>(data: T): Promise<{ success: boolean }> {
    const response = await this.#fetch("tables/rows/insert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }
    const success = await response.json()
    return { success }

  }

  async insertRecords<T>(data: T[]): Promise<{ success: boolean }> {
    const response = await this.#fetch("tables/upload-bulk-json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const success = await response.json()
    return { success }

  }

  async deleteRecord(id: string): Promise<{ success: boolean }> {
    const response = await this.#fetch(`tables/rows/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }
    const success = await response.json()
    return { success }
  }

  async createView(id: string, table: string, type: string, config: object) {
    const response = await this.#fetch("tables/viz/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { id, table, type, config } }),
    });

    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const success = await response.json()
    return { success }
  }

  async updateView(id: string, config: object) {
    const response = await this.#fetch("tables/viz/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { id, config } }),
    });

    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const success = await response.json()
    return { success }
  }

  async deleteView(id: string) {
    const response = await this.#fetch("tables/viz/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { id } }),
    });

    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const success = await response.json()
    return { success }
  }

  async getView(id: string) {
    const response = await this.#fetch("tables/viz/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { id } }),
    });
    if (!response.ok) {
      throw new BasesClientError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const success = await response.json()
    return { success }
  }

}