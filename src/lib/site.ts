export const SITE = {
  name: "Mio Express",
  tagline: "Mini mercado autônomo 24h no seu condomínio",
  // endereço público usado em links de compartilhamento (prévia do WhatsApp), sitemap e canonical.
  // Enquanto o domínio não aponta para o site novo, fica no pages.dev; depois do DNS (docs/DNS-GODADDY.md),
  // trocar para "https://mioexpress.com.br".
  url: "https://mioexpress.pages.dev",
  // enquanto estiver no endereço provisório, o Google não indexa o site (lançamento = domínio próprio)
  get launched() {
    return !this.url.includes("pages.dev");
  },
  city: "São José dos Campos",
  state: "SP",
  legalName: "G2J Comércio de Bebidas e Alimentos Ltda",
  cnpj: "47.326.086/0001-00",
  address: {
    street: "Rua Luiz Gustavo de Vasconcelos, 101",
    district: "Residencial Bosque dos Ipês",
    city: "São José dos Campos",
    state: "SP",
    zip: "12236-872",
  },
  whatsappNumber: "5512997397730",
  whatsappDisplay: "(12) 99739-7730",
  instagram: "https://www.instagram.com/mioexpressbrasil/",
  instagramHandle: "@mioexpressbrasil",
  facebook: "https://www.facebook.com/profile.php?id=61580459421097",
  // Google Analytics 4 (ID de medição "G-…"); vazio = desligado
  gaId: "G-066E2MVTX1",
  architectCredit: "Daniele Faustino Arquitetura & Interiores",
} as const;

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
