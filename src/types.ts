export type Config = {
  token: string;
  tbl?: string;
};

export type Field = {
  id: string;
  label: string;
  type: string;
  tbl: string;
  fld___id: string;
};

export interface getRecordsProps {
  mapValues?: boolean;
}

export interface getRecordProps extends getRecordsProps {
  id: string;
}
