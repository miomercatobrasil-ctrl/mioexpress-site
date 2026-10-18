export const SITE = {
  name: "Mio Express",
  tagline: "Mini mercado autônomo 24h no seu condomínio",
  url: "https://mioexpress.com.br",
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
  // TODO: confirmar URL da página do Facebook
  facebook: "https://www.facebook.com/mioexpressbrasil",
  architectCredit: "Daniele Faustino Arquitetura & Interiores",
} as const;

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
