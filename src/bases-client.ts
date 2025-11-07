import 'cross-fetch/polyfill';
import { BasesClientError } from "./errors";
import { Config, Field, getRecordProps, getRecordsProps } from './types';


export default class BasesClient {
  #token: string;
  #currentTable: string | null = null;
  #baseUrl = "https://hddb-service.fly.dev";

  constructor(config: Config) {
    const { token, tbl } = config;
    if (!token) {
      throw new Error("JWT token is required");
    }
    this.#token = token;
    if (tbl) {
      this.#currentTable = tbl;
    }
  }

  async setTable(tbl: string): Promise<void> {
    this.#currentTable = tbl;
  }


  async #fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.#currentTable) {
      throw new Error(
        "Table not set. Call setTable() before making any requests."
      );
    }
    const url = new URL(endpoint, this.#baseUrl);
    return fetch(url.toString(), {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${this.#token}`,
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
    if (!fields || !Array.isArray(fields) || !records || !Array.isArray(records)) {
      throw new BasesClientError("Invalid response structure: expected data and fields arrays");
    }
    
    const fieldMap = fields.reduce((acc: Record<string, string>, field: any) => {
      if (field?.id && field?.label) {
        acc[field.id] = field.label;
      }
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

    if (!fields || !Array.isArray(fields)) {
      throw new BasesClientError("Invalid response structure: expected fields array");
    }

    const fieldMap = fields.reduce((acc: Record<string, string>, field: any) => {
      if (field?.id && field?.label) {
        acc[field.id] = field.label;
      }
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