export interface University {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  view_access: string;
}

export interface Major {
  id: string;
  university_id: string;
  name: string;
  code: string | null;
}

export interface Semester {
  id: string;
  major_id: string;
  number: number;
  label: string | null;
}

export interface Subject {
  id: string;
  semester_id: string;
  name: string;
  code: string | null;
}

export interface Material {
  id: string;
  subject_id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  type: string;
  r2_key: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  deleted: number;
  created_at: string;
  uploader_name?: string;
}

export interface AppUser {
  id: string;
  email: string;
  display_name: string | null;
  role: 'STUDENT' | 'CLASS_REP' | 'ADMIN';
  university_id: string | null;
  verified: number;
  created_at: string;
}
