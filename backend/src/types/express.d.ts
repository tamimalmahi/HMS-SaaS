import { IHouse } from "../models/House";
import { IUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      house?: IHouse;
      houseId?: string;
      cookies: Record<string, string | undefined>;
    }
  }
}
