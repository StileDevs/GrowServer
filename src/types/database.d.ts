export interface User {
  id_user: string;
  name: string;
  password: string;
  role: string;
  gems?: number;
  inventory?: Buffer;
  clothing?: Buffer;
  created_at: Date;
}
