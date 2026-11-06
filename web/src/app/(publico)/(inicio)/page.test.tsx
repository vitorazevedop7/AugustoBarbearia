import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPublicBarbers,
  getPublicServices,
  getPublicShop,
} from "@/lib/api/public";
import { barbers, service, services, shop } from "@/test/vitrine-data";
import HomePage from "./page";

// O componente de servidor que consulta a API tem sua própria suíte.
vi.mock("@/components/api-status", () => ({ ApiStatus: () => null }));
vi.mock("@/lib/api/public", () => ({
  getPublicShop: vi.fn(),
  getPublicServices: vi.fn(),
  getPublicBarbers: vi.fn(),
}));

function section(name: string) {
  return screen.getByRole("region", { name });
}

describe("página inicial (vitrine)", () => {
  beforeEach(() => {
    vi.mocked(getPublicShop).mockResolvedValue(shop);
    vi.mocked(getPublicServices).mockResolvedValue(services);
    vi.mocked(getPublicBarbers).mockResolvedValue(barbers);
  });

  it("apresenta a barbearia e chama para agendar", async () => {
    render(await HomePage());

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Augusto Barbearia",
      }),
    ).toBeVisible();
    expect(
      within(main).getByText(
        "Escolha o serviço, o barbeiro e o horário pelo celular, sem precisar ligar.",
      ),
    ).toBeInTheDocument();
    for (const link of within(main).getAllByRole("link", {
      name: "Agendar horário",
    })) {
      expect(link).toHaveAttribute("href", "/agendar");
    }
    expect(
      within(main).getByRole("link", { name: "Ver serviços" }),
    ).toHaveAttribute("href", "/servicos");
    // Sem o texto "sobre" preenchido, a seção não aparece.
    expect(
      screen.queryByRole("region", { name: "Sobre a barbearia" }),
    ).toBeNull();
    expect(
      screen.queryByRole("img", {
        name: "Mãos de barbeiro com tesoura durante um corte de cabelo",
      }),
    ).toBeNull();
  });

  it("mostra o hero de tela inteira com a foto decorativa, prioridade e o degradê atrás do texto", async () => {
    render(await HomePage());

    const hero = screen
      .getByRole("heading", { level: 1, name: "Augusto Barbearia" })
      .closest("section")!;
    const photo = within(hero).getByRole("presentation");
    expect(photo).toHaveAttribute("alt", "");
    expect(decodeURIComponent(photo.getAttribute("src")!)).toContain(
      "/images/vitrine/hero.jpg",
    );
    expect(photo).toHaveAttribute("data-nimg", "fill");
    expect(photo).toHaveAttribute("sizes", "100vw");
    expect(photo).toHaveAttribute("fetchpriority", "high");
    expect(photo).not.toHaveAttribute("loading", "lazy");
    // Tela inteira; no desktop, a camada da foto fica fixa e o hero a recorta.
    expect(hero).toHaveClass("min-h-svh", "[clip-path:inset(0)]");
    expect(photo.parentElement).toHaveClass("absolute", "motion-safe:lg:fixed");
    // O degradê escurece só o lado do texto (embaixo, à esquerda).
    const overlay = hero.querySelector(".from-ink\\/90");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay).toHaveClass("bg-linear-to-tr");
    expect(hero).toHaveClass("items-end");
  });

  it("usa a frase de destaque e o texto sobre da administração", async () => {
    vi.mocked(getPublicShop).mockResolvedValue({
      ...shop,
      tagline: "Frase cadastrada.",
      about: "Texto sobre cadastrado.",
    });

    render(await HomePage());

    expect(screen.getByText("Frase cadastrada.")).toBeInTheDocument();
    expect(section("Sobre a barbearia")).toHaveTextContent(
      "Texto sobre cadastrado.",
    );
    const photo = within(section("Sobre a barbearia")).getByRole("img", {
      name: "Mãos de barbeiro com tesoura durante um corte de cabelo",
    });
    expect(decodeURIComponent(photo.getAttribute("src")!)).toContain(
      "/images/vitrine/sobre.jpg",
    );
    expect(photo).toHaveAttribute("loading", "lazy");
  });

  it("RN-61: mostra até 4 serviços, com preço, duração e o link para todos", async () => {
    vi.mocked(getPublicServices).mockResolvedValue([
      ...services,
      service(3, "Barba"),
      service(4, "Pigmentação"),
      service(5, "Sobrancelha"),
    ]);

    render(await HomePage());

    const servicos = section("Serviços");
    expect(
      within(servicos)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Corte + Barba", "Corte Simples", "Barba", "Pigmentação"]);
    expect(servicos).toHaveTextContent("Preço: R$ 35,00");
    expect(servicos).toHaveTextContent("Duração: 45 min");
    expect(
      within(servicos).getByRole("link", { name: "Agendar Corte Simples" }),
    ).toHaveAttribute("href", "/agendar?servico=1");
    expect(
      within(servicos).getByRole("link", { name: "Ver todos os serviços" }),
    ).toHaveAttribute("href", "/servicos");
    // A tabela de preços: uma linha por serviço, separadas por filetes.
    const grid = within(servicos).getByRole("list");
    expect(grid).toHaveClass("divide-y");
    expect(grid.parentElement).toHaveClass("border-t-2", "border-ink");
    expect(within(grid).getAllByRole("listitem")[1]).toHaveAttribute(
      "data-reveal",
      "rise",
    );
  });

  it.each([null, "Sobre cadastrado."])(
    "mostra a galeria depois dos serviços e alterna os fundos com about=%s",
    async (about) => {
      vi.mocked(getPublicShop).mockResolvedValue({ ...shop, about });
      render(await HomePage());
      const gallery = section("Nosso trabalho");
      expect(section("Serviços").nextElementSibling).toBe(gallery);
      expect(
        within(gallery)
          .getAllByRole("img")
          .map((image) => image.getAttribute("alt")),
      ).toEqual([
        "Barbeiro acertando um degradê com a máquina",
        "Barba feita na navalha, com toalha quente",
        "Tesoura, pente e pincel na bancada",
        "Acabamento de barba com máquina e pente",
      ]);
      expect(gallery).toHaveClass(about ? "bg-paper" : "bg-surface");
      expect(section("Nossa equipe")).toHaveClass("bg-paper");
      expect(
        within(gallery).getByRole("link", { name: "Agendar horário" }),
      ).toHaveAttribute("href", "/agendar");
      for (const photo of within(gallery).getAllByRole("img")) {
        expect(photo).toHaveAttribute("loading", "lazy");
        expect(photo.parentElement).toHaveAttribute("data-reveal", "zoom");
      }
    },
  );

  it("mostra a faixa de agendamento entre a galeria e a equipe, só com tipo", async () => {
    render(await HomePage());
    const band = section("Agende pelo celular");
    expect(section("Nosso trabalho").nextElementSibling).toBe(band);
    expect(band.nextElementSibling).toBe(section("Nossa equipe"));
    // Faixa escura sem foto: as seções vizinhas já são de fotos.
    expect(band).toHaveClass("bg-ink");
    expect(within(band).queryByRole("presentation")).toBeNull();
    expect(within(band).queryByRole("img")).toBeNull();
    expect(band).toHaveTextContent("Receba a confirmação por e-mail.");
    expect(
      within(band).getByRole("link", { name: "Agendar horário" }),
    ).toHaveAttribute("href", "/agendar");
  });

  it("RN-60: mostra a equipe com a inicial no lugar da foto que falta", async () => {
    render(await HomePage());

    const equipe = section("Nossa equipe");
    const cards = within(equipe).getAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText("E")).toBeInTheDocument();
    expect(within(cards[0]).queryByRole("img")).toBeNull();
    expect(
      within(equipe).getByRole("link", { name: "Agendar com Lauro" }),
    ).toHaveAttribute("href", "/agendar?barbeiro=2");
    expect(
      within(equipe).getByRole("link", { name: "Conhecer a equipe" }),
    ).toHaveAttribute("href", "/barbeiros");
    // Os três retratos formam um conjunto: topos alinhados, sem degraus.
    for (const item of within(equipe).getAllByRole("listitem")) {
      expect(item.className).not.toContain("mt-");
    }
  });

  it("não desenha ornamentos nas bordas das seções", async () => {
    vi.mocked(getPublicShop).mockResolvedValue({
      ...shop,
      about: "Texto sobre cadastrado.",
    });

    render(await HomePage());

    for (const name of ["Sobre a barbearia", "Serviços", "Nossa equipe"]) {
      const region = section(name);
      expect(region.querySelector("svg[data-reveal='fade']")).toBeNull();
    }
  });

  it("RN-02: mostra o horário de funcionamento sem contato preenchido", async () => {
    render(await HomePage());

    const contato = section("Horário e contato");
    expect(contato).toHaveAttribute("id", "contato");
    expect(contato).toHaveTextContent("Segunda a sexta10h às 19h");
    expect(contato).toHaveTextContent("Sábado9h às 14h");
    expect(contato).toHaveTextContent("DomingoFechado");
    expect(within(contato).queryByText("Como chegar")).toBeNull();
    // Sem contato cadastrado, a seção não promete como falar com a barbearia.
    expect(contato).toHaveTextContent("Quando estamos abertos.");
    expect(contato).not.toHaveTextContent("como falar com a barbearia");
  });

  it("com só o endereço, fala de onde estamos, não de contato", async () => {
    vi.mocked(getPublicShop).mockResolvedValue({
      ...shop,
      address: "Rua A, 10",
    });

    render(await HomePage());

    const contato = section("Horário e contato");
    expect(contato).toHaveTextContent("Quando estamos abertos e onde estamos.");
    expect(
      within(contato).getByRole("heading", { name: "Onde estamos" }),
    ).toBeInTheDocument();
  });

  it("mostra Como funciona entre a equipe e o contato", async () => {
    render(await HomePage());
    const how = section("Como funciona");
    expect(section("Nossa equipe").nextElementSibling).toBe(how);
    expect(how.nextElementSibling).toBe(section("Horário e contato"));
    expect(within(how).getAllByRole("listitem")).toHaveLength(4);
  });

  it("mostra o endereço e os contatos preenchidos", async () => {
    vi.mocked(getPublicShop).mockResolvedValue({
      ...shop,
      address: "Rua A, 10",
      whatsapp: "75999990000",
      instagram: "augusto",
    });

    render(await HomePage());

    const contato = section("Horário e contato");
    expect(contato).toHaveTextContent("Rua A, 10");
    expect(
      within(contato).getByRole("link", { name: /Como chegar/ }),
    ).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%2010",
    );
    expect(
      within(contato).getByRole("link", { name: "WhatsApp (75) 99999-0000" }),
    ).toHaveAttribute("href", "https://wa.me/5575999990000");
    expect(
      within(contato).getByRole("link", { name: "Instagram @augusto" }),
    ).toHaveAttribute("href", "https://www.instagram.com/augusto/");
    expect(within(contato).queryByText("E-mail")).toBeNull();
    expect(contato).toHaveTextContent(
      "Quando estamos abertos e como falar com a barbearia.",
    );
    expect(
      within(contato).getByRole("heading", { name: "Onde estamos e contato" }),
    ).toBeInTheDocument();
  });

  it("mostra os estados vazios sem serviço nem barbeiro", async () => {
    vi.mocked(getPublicServices).mockResolvedValue([]);
    vi.mocked(getPublicBarbers).mockResolvedValue([]);

    render(await HomePage());

    expect(
      screen.getByText("Nenhum serviço disponível no momento"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum barbeiro disponível no momento"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ver todos os serviços" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Conhecer a equipe" }),
    ).toBeNull();
  });

  it("avisa só na seção afetada quando a API não responde", async () => {
    vi.mocked(getPublicShop).mockResolvedValue(null);
    vi.mocked(getPublicServices).mockResolvedValue(null);

    render(await HomePage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Augusto Barbearia" }),
    ).toBeVisible();
    expect(within(section("Serviços")).getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os serviços. Tente novamente em instantes.",
    );
    expect(
      within(section("Horário e contato")).getByRole("alert"),
    ).toHaveTextContent(
      "Não foi possível carregar o horário e o contato. Tente novamente em instantes.",
    );
    expect(
      within(section("Nossa equipe")).getAllByRole("article"),
    ).toHaveLength(3);
  });
});
