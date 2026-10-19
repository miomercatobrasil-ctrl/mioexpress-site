// Conteúdo editável do site. Itens marcados com "CONFIRMAR" dependem de validação da Mio.

export const unidades: { nome: string; unidades?: number }[] = [
  { nome: "Terraços", unidades: 296 },
  { nome: "Portal da Vila", unidades: 150 },
  { nome: "Adiana", unidades: 72 },
  { nome: "Reiwa", unidades: 90 },
  { nome: "Bourbon", unidades: 192 },
  { nome: "Home", unidades: 176 },
  { nome: "Kazza", unidades: 120 },
  { nome: "Itapoã", unidades: 90 },
  { nome: "Rio Branco", unidades: 72 },
  { nome: "Maragogi", unidades: 91 },
  { nome: "San Francisco", unidades: 64 },
  { nome: "Porto Régio", unidades: 64 },
  { nome: "Tahiti" },
  { nome: "Redentor", unidades: 60 },
  { nome: "Mediterrâneo", unidades: 120 },
  { nome: "Estoril" },
  { nome: "Itamarati", unidades: 80 },
  { nome: "Girassol", unidades: 64 },
  { nome: "Millenium" },
  { nome: "Solar", unidades: 90 },
];

export const depoimentos: { texto: string; autor: string; papel: string; condominio: string; rascunho?: boolean }[] = [
  {
    // CONFIRMAR: texto real e autorização do condomínio para publicar.
    texto:
      "Espaço reservado para o depoimento do Residencial Mediterrâneo. Envie o texto aprovado pelo síndico e substituímos aqui.",
    autor: "Nome do síndico",
    papel: "Síndico",
    condominio: "Residencial Mediterrâneo",
    rascunho: true,
  },
];

export const categorias = [
  "Bebidas geladas",
  "Snacks",
  "Mercearia",
  "Limpeza",
  "Higiene",
  "Sorvetes",
  "Congelados",
  "Café da manhã",
  "Pet",
];
