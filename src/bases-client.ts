import fetch from "cross-fetch";
import { AuthenticationError, BasesClientError } from "./errors.js";

type Config = {
  org: string;
  db: string;
  tbl: string;
};

export default class BasesClient {
  #config: Config & { token: string };
  #authToken: string | null = null;
  #baseUrl = "https://bases.datasketch.co";

  constructor(config: Config & { token: string }) {
    this.#config = config;
  }

  async #init(): Promise<void> {
    if (!this.#authToken) {
      try {
        const response = await fetch(
          "https://api.datasketch.co/v1/auth/bases",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(this.#config),
          }
        );

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
            `Failed to initialize client: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }
  }

  async #fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    await this.#init();
    const url = new URL(endpoint, this.#baseUrl);
    return fetch(url.toString(), {
      ...options,
      headers: {
        ...options.headers,
        'X-DSKTCH-AUTHORIZATION': `Bearer ${this.#authToken}`,
      },
    });
  }

  async getRecords<T>(): Promise<T[]> {
    const response = await this.#fetch("md");
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async getRecord<T>(id: string): Promise<T | null> {
    const response = await this.#fetch(`md?field=rcd___id&value=${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  async insertRecords<T>(data: T): Promise<{ inserted_ids: string[] }> {
    const response = await this.#fetch("md/insert", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return { inserted_ids: result.inserted_ids };
  }

  async updateRecord<T>(id: string, data: Partial<T>): Promise<void> {
    const response = await this.#fetch("md/update", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, data }),
    });
    
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
  }
  
  async deleteRecord(id: string): Promise<void> {
    const response = await this.#fetch("md/delete", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });
    
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
  }
}
