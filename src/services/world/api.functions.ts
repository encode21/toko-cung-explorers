import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ApiResult } from "./contracts";
export const worldApi = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    z
      .object({
        operation: z.enum([
          "me",
          "state",
          "dungeon",
          "login",
          "register",
          "pin-request",
          "pin-setup",
          "pin-reset",
          "logout",
          "profile",
          "command",
          "channels",
          "join",
          "leave",
          "public-profile",
          "connection-profile",
        ]),
        data: z.record(z.unknown()).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }): Promise<ApiResult> => {
    const g = await import("./gateway.server");
    g.assertOrigin();
    if (data.operation === "pin-request") {
      const request = z
        .object({ phone: z.string().regex(/^[+0-9]{9,16}$/), purpose: z.enum(["setup", "reset"]) })
        .parse(data.data);
      return g.backend("pin/request", "POST", request, "");
    }
    if (
      data.operation === "register" ||
      data.operation === "login" ||
      data.operation === "pin-setup" ||
      data.operation === "pin-reset"
    ) {
      const credentials = z
        .object({
          phone: z.string().regex(/^[+0-9]{9,16}$/),
          pin: z.string().regex(/^[0-9]{6}$/),
          ...(data.operation === "register"
            ? {
                name: z.string().trim().min(1).max(18),
                pin_confirmation: z.string().regex(/^[0-9]{6}$/),
              }
            : {}),
          ...(data.operation === "login" || data.operation === "register"
            ? {}
            : {
                code: z.string().regex(/^(?:[0-9]{6}|[a-f0-9]{48})$/),
                pin_confirmation: z.string().regex(/^[0-9]{6}$/),
              }),
        })
        .parse(data.data);
      const path =
        data.operation === "register"
          ? "register"
          : data.operation === "login"
            ? "login"
            : data.operation === "pin-setup"
              ? "pin/setup"
              : "pin/reset";
      const result = await g.backend(path, "POST", credentials, "");
      if (!result.ok) return result;
      const auth = z
        .object({ token: z.string().min(20), expiresIn: z.number().positive() })
        .parse(result.value);
      const me = await g.backend("me", "GET", undefined, auth.token);
      if (me.ok) g.saveAccountCookie(auth.token, auth.expiresIn);
      return me; // Never serialize account tokens into browser JavaScript.
    }
    if (data.operation === "logout") {
      const result = await g.backend("logout", "POST", {});
      g.clearAccountCookie();
      return result.ok || result.status === 401 ? { ok: true, value: null } : result;
    }
    if (!g.accountToken())
      return { ok: false, status: 401, message: "Masuk dengan akun Toko Cung." };
    if (data.operation === "public-profile") {
      const id = z.string().uuid().parse(data.data?.["id"]);
      return g.backend(`profiles/${id}`);
    }
    if (data.operation === "connection-profile") {
      const id = z.string().uuid().parse(data.data?.["id"]);
      const channel = z
        .string()
        .regex(/^(?:CHANNEL-0[1-3]|DNG-[0-9A-Z]{26})$/)
        .parse(data.data?.["channel"]);
      return g.backend(`connections/${id}/profile?channel=${encodeURIComponent(channel)}`);
    }
    const routes = {
      dungeon: ["dungeon", "POST"],
      me: ["me", "GET"],
      state: ["state", "GET"],
      profile: ["profile", "PATCH"],
      command: ["quests/command", "POST"],
      channels: ["channels", "GET"],
      join: ["channels/join", "POST"],
      leave: ["channels/leave", "POST"],
    } as const;
    const [path, method] = routes[data.operation];
    return g.backend(path, method, method === "GET" ? undefined : data.data);
  });
