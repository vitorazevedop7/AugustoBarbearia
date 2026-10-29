import { describe, expect, it } from "vitest";
import { formatPhone } from "./phone";

describe("formatPhone", () => {
  it.each([
    ["11987654321", "(11) 98765-4321"],
    ["2134567890", "(21) 3456-7890"],
    ["123", "123"],
  ])("formata %s como %s", (digits, expected) => {
    expect(formatPhone(digits)).toBe(expected);
  });
});
