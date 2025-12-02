import { NameStyles, ROLE } from "@growserver/const";
import { PeerData } from "@growserver/types";

export class Name {
  constructor(private data: PeerData) {}

  public getCountryFlag() {
    switch (this.data.role) {
      default: {
        return this.data.country;
      }
      case ROLE.DEVELOPER: {
        return "rt";
      }
    }
  }

  public getCountryState() {
    const country = this.getCountryFlag();

    return `${country}|${this.data.level >= 125 ? NameStyles.MAX_LEVEL : ""}`;
  }
}