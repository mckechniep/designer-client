import { describe, expect, it } from "vitest";
import {
  defaultClientNameForEmail,
  shouldAutoProvisionClients,
} from "@/lib/auth/ensure-portal-profile";

describe("portal profile provisioning helpers", () => {
  it("only enables automatic client provisioning for explicit truthy values", () => {
    expect(shouldAutoProvisionClients("true")).toBe(true);
    expect(shouldAutoProvisionClients("1")).toBe(true);
    expect(shouldAutoProvisionClients("yes")).toBe(true);
    expect(shouldAutoProvisionClients("false")).toBe(false);
    expect(shouldAutoProvisionClients("")).toBe(false);
  });

  it("creates a readable default client name from the email local part", () => {
    expect(defaultClientNameForEmail("peter@example.com")).toBe("peter");
    expect(defaultClientNameForEmail("@example.com")).toBe("Client");
  });
});
