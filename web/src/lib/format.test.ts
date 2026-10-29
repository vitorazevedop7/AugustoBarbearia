import { describe, expect, it } from "vitest";
import { formatPhone, toTimeInput } from "./format";

describe("formatPhone", () => {
  it.each([
    ["75999990000", "(75) 99999-0000"],
    ["7533334444", "(75) 3333-4444"],
    ["123", "123"],
  ])("formata %s como %s", (digits, expected) => {
    expect(formatPhone(digits)).toBe(expected);
  });
});

describe("toTimeInput", () => {
  it("corta os segundos e trata hora ausente como vazio", () => {
    expect(toTimeInput("09:30:00")).toBe("09:30");
    expect(toTimeInput(null)).toBe("");
  });
});
