import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveProfile } from "./actions";
import { ProfileForm } from "./profile-form";

vi.mock("./actions", () => ({ saveProfile: vi.fn() }));

function renderForm() {
  render(
    <ProfileForm
      email="ana@example.com"
      initialValues={{ name: "Ana", phone: "" }}
    />,
  );
}

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.mocked(saveProfile).mockReset();
  });

  it("mostra o sucesso e o telefone que a API salvou", async () => {
    vi.mocked(saveProfile).mockResolvedValue({
      status: "success",
      message: "Perfil salvo.",
      values: { name: "Ana", phone: "(11) 98765-4321" },
    });
    renderForm();

    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "11987654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Perfil salvo.",
    );
    expect(screen.getByLabelText("Telefone")).toHaveValue("(11) 98765-4321");
    const data = vi.mocked(saveProfile).mock.calls[0][1];
    expect(data.get("name")).toBe("Ana");
    expect(data.get("phone")).toBe("11987654321");
  });

  it("mostra o erro da API acima dos campos", async () => {
    vi.mocked(saveProfile).mockResolvedValue({
      status: "error",
      message: "Confira os dados informados e tente novamente.",
      values: { name: "Ana", phone: "98765-4321" },
    });
    renderForm();

    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "98765-4321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Confira os dados informados e tente novamente.",
    );
    expect(screen.getByLabelText("Telefone")).toHaveValue("98765-4321");
  });
});
