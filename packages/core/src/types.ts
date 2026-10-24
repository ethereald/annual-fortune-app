export type DetailLevel = "summary" | "standard" | "deep";

export type Gender = "female" | "male" | "unspecified";

export type SchoolSetting = "quanshu";

export interface FortuneRequest {
  birthDate: string;
  birthTime: string;
  gender: Gender;
  city: string;
  yearFrom: number;
  yearTo: number;
  detailLevel: DetailLevel;
  schoolSetting: SchoolSetting;
}

export interface SavedProfile extends FortuneRequest {
  id: string;
  name: string;
  createdAt: string;
}
