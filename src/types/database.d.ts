export interface User {
  id_user: string;
  name: string;
  display_name: string;
  password: string;
  role: string;
  gems?: number;
  level: number;
  exp: number;
  inventory?: Buffer;
  clothing?: Buffer;
  last_visited_worlds?: Buffer;
  created_at: Date;
}
