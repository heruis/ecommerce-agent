import { account } from "./account";
import { app } from "./app";
import { auth } from "./auth";
import { billing } from "./billing";
import { common } from "./common";
import { marketing } from "./marketing";
import { tools } from "./tools";

/** The English dictionary is the reference shape every other language must match. */
export const en = { common, marketing, auth, account, billing, tools, app };

export type Dictionary = typeof en;
