import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  run: ["start", "view"],
  approval: ["resolve"],
  pr: ["create"],
} as const;

const ac = createAccessControl(statement);

export const roles = {
  viewer: ac.newRole({ run: ["view"] }),
  maintainer: ac.newRole({
    run: ["start", "view"],
    approval: ["resolve"],
    pr: ["create"],
  }),
};

export const auth = betterAuth({
  database: {
    type: "postgres",
    url: process.env.POSTGRES_URL!,
  },
  plugins: [adminPlugin({ ac, roles })],
});
