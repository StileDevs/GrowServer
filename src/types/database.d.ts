export interface User {
  id_user: string;
  name: string;
  password: string;
  role: string;
  inventory: Buffer;
  created_at: Date;
}
